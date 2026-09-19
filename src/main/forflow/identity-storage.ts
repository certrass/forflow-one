import { safeStorage } from 'electron'
import { mkdirSync, readFileSync, renameSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeForflowServiceUrl } from '../../shared/forflow-service-policy'

export class ForflowIdentityStorage {
  private memoryToken: { serverUrl: string; token: string } | null = null
  constructor(private readonly directory: string) {}

  private path(name: string): string {
    return join(this.directory, `forflow-${name}.json`)
  }

  private write(name: string, value: unknown): void {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 })
    const target = this.path(name)
    const temporary = `${target}.tmp`
    writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 })
    renameSync(temporary, target)
  }

  serverUrl(): string | null {
    try {
      const value: unknown = JSON.parse(readFileSync(this.path('identity-config'), 'utf8'))
      if (
        value &&
        typeof value === 'object' &&
        'serverUrl' in value &&
        typeof value.serverUrl === 'string'
      ) {
        return normalizeForflowServiceUrl(value.serverUrl)
      }
    } catch {
      /* Invalid configuration never falls back to an upstream server. */
    }
    return null
  }

  configure(serverUrl: string | null): void {
    this.clearToken()
    this.write('identity-config', { serverUrl })
  }

  token(serverUrl: string): { token: string; persistence: 'encrypted' | 'memory' } | null {
    if (this.memoryToken?.serverUrl === serverUrl) {
      return { token: this.memoryToken.token, persistence: 'memory' }
    }
    try {
      const value: unknown = JSON.parse(readFileSync(this.path('identity-session'), 'utf8'))
      if (
        value &&
        typeof value === 'object' &&
        'serverUrl' in value &&
        value.serverUrl === serverUrl &&
        'encrypted' in value &&
        typeof value.encrypted === 'string' &&
        this.canEncrypt()
      ) {
        const token = safeStorage.decryptString(Buffer.from(value.encrypted, 'base64'))
        if (/^[A-Za-z0-9_-]{43}$/.test(token)) {
          return { token, persistence: 'encrypted' }
        }
      }
    } catch {
      /* A missing keychain entry requires a fresh sign-in. */
    }
    return null
  }

  private canEncrypt(): boolean {
    return (
      safeStorage.isEncryptionAvailable() &&
      (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text')
    )
  }

  saveToken(serverUrl: string, token: string): void {
    this.clearToken()
    if (this.canEncrypt()) {
      this.write('identity-session', {
        serverUrl,
        encrypted: safeStorage.encryptString(token).toString('base64')
      })
    } else {
      this.memoryToken = { serverUrl, token }
    }
  }

  clearToken(): void {
    this.memoryToken = null
    rmSync(this.path('identity-session'), { force: true })
  }
}
