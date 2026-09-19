import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ForflowIdentityClient } from './identity-client'
import { ForflowIdentityStorage } from './identity-storage'
import { readIdentityResponse } from './identity-response'

const crypto = vi.hoisted(() => ({ available: true }))
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => crypto.available,
    getSelectedStorageBackend: () => 'keychain',
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`),
    decryptString: (value: Buffer) => value.toString().slice('encrypted:'.length)
  }
}))

const url = 'https://identity.example.cn'
const token = 'a'.repeat(43)
const session = {
  user: {
    id: 'id-admin',
    username: 'admin',
    displayName: '管理员',
    role: 'admin',
    disabled: false
  },
  tenant: 'test',
  expiresAt: Date.now() + 10000
}
const config = { product: 'Forflow One', contract: 1, authentication: 'password' }
const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status })
let directory: string
let storage: ForflowIdentityStorage
let client: ForflowIdentityClient
const fetcher = vi.fn<typeof fetch>()

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'forflow-client-'))
  crypto.available = true
  storage = new ForflowIdentityStorage(directory)
  client = new ForflowIdentityClient(storage)
  vi.stubGlobal('fetch', fetcher)
  fetcher.mockReset()
})
afterEach(() => {
  vi.unstubAllGlobals()
  rmSync(directory, { recursive: true, force: true })
})

describe('independent identity client', () => {
  it('starts locally without network or upstream credential discovery', async () => {
    expect(await client.status()).toMatchObject({ state: 'local', session: null })
    expect(fetcher).not.toHaveBeenCalled()
    await expect(client.configure('https://login.onorca.dev')).rejects.toThrow('上游')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('checks the contract before saving and does not follow redirects', async () => {
    fetcher.mockResolvedValueOnce(json({ product: 'Orca', contract: 1 }))
    await expect(client.configure(url)).rejects.toThrow('格式不匹配')
    expect(storage.serverUrl()).toBeNull()
    fetcher.mockResolvedValueOnce(json(config))
    expect(await client.configure(url)).toMatchObject({ state: 'signed-out', serverUrl: url })
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'error', cache: 'no-store' })
  })
  it('keeps the token out of renderer results and encrypts persisted sessions', async () => {
    storage.configure(url)
    fetcher.mockResolvedValueOnce(json({ ...session, token })).mockResolvedValueOnce(json(session))
    const status = await client.login({ username: 'admin', password: 'test-password' })
    expect(status).toMatchObject({ state: 'connected', persistence: 'encrypted' })
    expect(JSON.stringify(status)).not.toContain(token)
    expect(readFileSync(join(directory, 'forflow-identity-session.json'), 'utf8')).not.toContain(
      token
    )
    const restored = new ForflowIdentityStorage(directory)
    expect(restored.token(url)?.token).toBe(token)
    expect(restored.token('https://different.example.cn')).toBeNull()
  })
  it('uses memory only when keychain encryption is unavailable', () => {
    crypto.available = false
    storage.saveToken(url, token)
    expect(storage.token(url)).toMatchObject({ persistence: 'memory', token })
    expect(existsSync(join(directory, 'forflow-identity-session.json'))).toBe(false)
    expect(new ForflowIdentityStorage(directory).token(url)).toBeNull()
  })
  it('clears an expired session but keeps unavailable distinct from signed in', async () => {
    storage.configure(url)
    storage.saveToken(url, token)
    fetcher.mockRejectedValueOnce(new Error('offline'))
    expect(await client.status()).toMatchObject({ state: 'unavailable', session: null })
    expect(storage.token(url)).not.toBeNull()
    fetcher.mockResolvedValueOnce(json({ error: '登录已失效' }, 401))
    expect(await client.status()).toMatchObject({ state: 'signed-out', session: null })
    expect(storage.token(url)).toBeNull()
  })
  it('clears local sessions even if remote logout fails', async () => {
    storage.configure(url)
    storage.saveToken(url, token)
    fetcher.mockRejectedValueOnce(new Error('offline'))
    expect(await client.logout()).toMatchObject({
      state: 'signed-out',
      error: expect.stringContaining('本机会话已清除')
    })
    expect(storage.token(url)).toBeNull()
  })
  it('revokes a delayed login after logout instead of restoring it', async () => {
    storage.configure(url)
    let finish: ((value: Response) => void) | undefined
    fetcher.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const pending = client.login({ username: 'admin', password: 'test-password' })
    await client.logout()
    fetcher.mockResolvedValueOnce(json({ success: true }))
    finish?.(json({ ...session, token }))
    await expect(pending).rejects.toThrow('配置已改变')
    expect(storage.token(url)).toBeNull()
    expect(fetcher.mock.calls.at(-1)?.[0]).toBe(`${url}/v1/identity/logout`)
  })
  it('cannot overwrite a newer service selection after a delayed health response', async () => {
    let finish: ((value: Response) => void) | undefined
    fetcher.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const pending = client.configure(url)
    fetcher.mockResolvedValueOnce(json(config))
    await client.configure('https://new.example.cn')
    finish?.(json(config))
    await expect(pending).rejects.toThrow('配置已改变')
    expect(storage.serverUrl()).toBe('https://new.example.cn')
  })
  it('rejects oversized responses while reading and cancels the stream', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(128 * 1024))
      },
      cancel
    })
    await expect(readIdentityResponse(new Response(stream))).rejects.toThrow('响应过大')
    expect(cancel).toHaveBeenCalled()
  })
  it('does not expose malformed server structures as raw schema errors', async () => {
    storage.configure(url)
    fetcher.mockResolvedValueOnce(json({ ...session, token: 'bad-token' }))
    await expect(client.login({ username: 'admin', password: 'test-password' })).rejects.toThrow(
      '格式不匹配'
    )
    expect(storage.token(url)).toBeNull()
  })
})
