import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setSecretStore, _resetSecretStoreForTests } from '../../shared/secret-store'
import {
  FORFLOW_MODEL_PROVIDERS,
  type ForflowModelProvider
} from '../../shared/forflow-model-accounts'
import { ForflowModelAccountStorage } from './model-account-storage'
import { ForflowModelAccountClient } from './model-account-client'

let directory: string
let client: ForflowModelAccountClient
const request = vi.fn<typeof fetch>()
const response = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
const accepted = () =>
  response({ choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }] })
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'model-client-'))
  setSecretStore({
    isEncryptionAvailable: () => true,
    describeProtectionGap: () => null,
    encryptString: (value) => Buffer.from(Buffer.from(value).map((byte) => byte ^ 77)),
    decryptString: (value) =>
      Buffer.from(Buffer.from(value).map((byte) => byte ^ 77)).toString('utf8')
  })
  request.mockReset()
  client = new ForflowModelAccountClient(new ForflowModelAccountStorage(directory), request)
  for (const provider of ['kimi', 'zhipu', 'deepseek'] as const) {
    client.save({ provider, model: 'fixture-model', apiKey: 'fixture-key' })
  }
})
afterEach(() => {
  vi.useRealTimers()
  rmSync(directory, { recursive: true, force: true })
  _resetSecretStoreForTests()
})

describe('bounded explicit connection tests', () => {
  it.each<ForflowModelProvider>(['kimi', 'zhipu', 'deepseek'])(
    'uses only the official %s destination and fixed prompt',
    async (provider) => {
      request.mockResolvedValueOnce(accepted())
      expect((await client.test(provider)).ok).toBe(true)
      expect(request).toHaveBeenCalledTimes(1)
      expect(request).toHaveBeenCalledWith(
        `${FORFLOW_MODEL_PROVIDERS[provider].baseUrl}/chat/completions`,
        expect.objectContaining({
          method: 'POST',
          redirect: 'error',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fixture-key' },
          body: JSON.stringify({
            model: 'fixture-model',
            messages: [{ role: 'user', content: 'Reply with OK.' }],
            max_tokens: 32,
            stream: false
          })
        })
      )
    }
  )
  it('accepts reasoning-only truncated output truthfully', async () => {
    request.mockResolvedValueOnce(
      response({
        choices: [
          { message: { content: null, reasoning_content: 'thinking' }, finish_reason: 'length' }
        ]
      })
    )
    expect(await client.test('kimi')).toMatchObject({
      ok: true,
      message: expect.stringContaining('截断')
    })
  })
  it.each([401, 429, 500, 302])('sanitizes HTTP %s without retry or body echo', async (status) => {
    request.mockResolvedValueOnce(new Response('fixture-key vendor private detail', { status }))
    const result = await client.test('kimi')
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toMatch(/fixture-key|private detail/)
    expect(request).toHaveBeenCalledTimes(1)
  })
  it.each([
    () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }),
    () => new Response('{', { headers: { 'content-type': 'application/json' } }),
    () => response({ choices: [] }),
    () => response({ choices: [{ message: { content: '' } }] }),
    () => response({ error: 'private detail' }),
    () => response({ choices: [{ message: { content: 'x'.repeat(70 * 1024) } }] })
  ])('rejects malformed, empty, unexpected and oversized responses', async (makeResponse) => {
    request.mockResolvedValueOnce(makeResponse())
    expect((await client.test('kimi')).ok).toBe(false)
  })
  it('does not publish a late success after removal or reuse it after reconfiguration', async () => {
    let finish: ((value: Response) => void) | undefined
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const oldTest = client.test('kimi')
    client.remove('kimi')
    client.save({ provider: 'kimi', model: 'new-model', apiKey: 'replacement-key' })
    request.mockResolvedValueOnce(accepted())
    const currentTest = client.test('kimi')
    finish?.(accepted())
    expect((await oldTest).ok).toBe(false)
    expect((await currentTest).ok).toBe(true)
    expect(request.mock.calls[1]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer replacement-key'
    })
    expect(request).toHaveBeenCalledTimes(2)
  })
  it('times out without retry and never returns raw transport errors', async () => {
    vi.useFakeTimers()
    request.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new Error('fixture-key private detail'))
          )
        })
    )
    const pending = client.test('kimi')
    await vi.advanceTimersByTimeAsync(15_000)
    expect(await pending).toMatchObject({ ok: false, message: expect.stringContaining('超时') })
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('deduplicates per provider, cancels removal and never reuses a removed credential', async () => {
    request.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new Error('cancelled')))
        })
    )
    const first = client.test('kimi')
    expect(client.test('kimi')).toBe(first)
    const other = client.test('deepseek')
    expect(request).toHaveBeenCalledTimes(2)
    client.remove('kimi')
    expect((await first).ok).toBe(false)
    expect((await client.test('kimi')).ok).toBe(false)
    expect(request).toHaveBeenCalledTimes(2)
    client.remove('deepseek')
    await other
  })
})
