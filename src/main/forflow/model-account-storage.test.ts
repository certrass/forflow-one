import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { _resetSecretStoreForTests, setSecretStore } from '../../shared/secret-store'
import type * as CredentialFile from '../integration-credential-file'
import { ForflowModelAccountStorage } from './model-account-storage'

const atomic = vi.hoisted(() => ({ fail: false }))
vi.mock('../integration-credential-file', async (original) => {
  const actual = await original<typeof CredentialFile>()
  return {
    ...actual,
    writeCredentialFileAtomic: (path: string, data: Buffer) => {
      if (atomic.fail) {
        throw new Error('secret path leaked')
      }
      actual.writeCredentialFileAtomic(path, data)
    }
  }
})

let directory: string
let storage: ForflowModelAccountStorage
let available: boolean
let gap: string | null
let decryptFails: boolean
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'model-account-'))
  storage = new ForflowModelAccountStorage(directory)
  available = true
  gap = null
  decryptFails = false
  atomic.fail = false
  const key = randomBytes(32)
  setSecretStore({
    isEncryptionAvailable: () => available,
    describeProtectionGap: () => gap,
    encryptString: (value) => {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
    },
    decryptString: (value) => {
      if (decryptFails) {
        throw new Error('secret path leaked')
      }
      const cipher = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12))
      cipher.setAuthTag(value.subarray(12, 28))
      return Buffer.concat([cipher.update(value.subarray(28)), cipher.final()]).toString('utf8')
    }
  })
})
afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
  _resetSecretStoreForTests()
})
const input = { provider: 'kimi', model: 'model-a', apiKey: 'test-secret-never-real' } as const
const record = () => join(directory, 'forflow-model-account-kimi.sealed')

describe('encrypted model accounts', () => {
  it('encrypts full records, returns no key, preserves key on model-only save and isolates removal', () => {
    expect(storage.list().every((row) => row.state === 'missing')).toBe(true)
    expect(storage.save(input)).toEqual({ provider: 'kimi', model: 'model-a', state: 'configured' })
    expect(readFileSync(record()).includes(Buffer.from(input.apiKey))).toBe(false)
    expect(readFileSync(record()).includes(Buffer.from(input.model))).toBe(false)
    if (process.platform !== 'win32') {
      expect(statSync(record()).mode & 0o777).toBe(0o600)
    }
    storage.save({ provider: 'kimi', model: 'model-b' })
    expect(storage.credential('kimi')).toEqual({ ...input, model: 'model-b' })
    storage.save({ provider: 'deepseek', model: 'other', apiKey: 'other-secret' })
    storage.remove('kimi')
    expect(storage.account('kimi').state).toBe('missing')
    expect(storage.account('deepseek').state).toBe('configured')
    expect(JSON.stringify(storage.list())).not.toContain('secret')
  })

  it.each(['unavailable', 'gap', 'decrypt', 'write'] as const)(
    'preserves ciphertext when %s fails',
    (failure) => {
      storage.save(input)
      const previous = readFileSync(record())
      if (failure === 'unavailable') {
        available = false
      }
      if (failure === 'gap') {
        gap = 'weak backend'
      }
      if (failure === 'decrypt') {
        decryptFails = true
      }
      if (failure === 'write') {
        atomic.fail = true
      }
      expect(() => storage.save({ ...input, apiKey: 'replacement' })).toThrow('无法安全')
      expect(readFileSync(record())).toEqual(previous)
      if (failure !== 'write') {
        expect(storage.account('kimi')).toEqual({ provider: 'kimi', state: 'locked', model: null })
      }
    }
  )

  it('never saves plaintext when encryption is unavailable and rejects malformed or oversized files', () => {
    available = false
    expect(() => storage.save(input)).toThrow('无法安全')
    expect(storage.account('kimi').state).toBe('missing')
    available = true
    for (const bytes of [Buffer.from(JSON.stringify(input)), Buffer.alloc(17 * 1024)]) {
      writeFileSync(record(), bytes)
      expect(storage.account('kimi').state).toBe('locked')
      expect(readFileSync(record())).toEqual(bytes)
    }
  })

  it('atomic replacement restores owner-only permissions', () => {
    storage.save(input)
    chmodSync(record(), 0o644)
    storage.save({ ...input, model: 'new-model' })
    if (process.platform !== 'win32') {
      expect(statSync(record()).mode & 0o777).toBe(0o600)
    }
  })
})
