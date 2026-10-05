import { closeSync, constants, fstatSync, mkdirSync, openSync, readSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { getSecretStore } from '../../shared/secret-store'
import {
  forflowModelAccountInputSchema,
  forflowModelProviderSchema,
  type ForflowModelAccount,
  type ForflowModelAccountInput,
  type ForflowModelProvider
} from '../../shared/forflow-model-accounts'
import { writeCredentialFileAtomic } from '../integration-credential-file'

const MAX_RECORD_BYTES = 16 * 1024
const credentialSchema = forflowModelAccountInputSchema.required()
export type ModelCredential = ForflowModelAccountInput & { apiKey: string }
export const MODEL_ACCOUNT_LOCKED = '无法安全读取或保存账户，请检查系统密钥链后重试。'

function protectedStore(): ReturnType<typeof getSecretStore> {
  const store = getSecretStore()
  if (!store.isEncryptionAvailable() || store.describeProtectionGap() !== null) {
    throw new Error(MODEL_ACCOUNT_LOCKED)
  }
  return store
}

export class ForflowModelAccountStorage {
  constructor(private readonly directory: string) {}

  private path(provider: ForflowModelProvider): string {
    const checked = forflowModelProviderSchema.safeParse(provider)
    if (!checked.success) {
      throw new Error('账户提供商无效。')
    }
    return join(this.directory, `forflow-model-account-${checked.data}.sealed`)
  }

  credential(provider: ForflowModelProvider): ModelCredential | null {
    let handle: number | undefined
    try {
      handle = openSync(this.path(provider), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
      const stat = fstatSync(handle)
      if (!stat.isFile() || stat.size === 0 || stat.size > MAX_RECORD_BYTES) {
        throw new Error(MODEL_ACCOUNT_LOCKED)
      }
      const buffer = Buffer.alloc(MAX_RECORD_BYTES + 1)
      const length = readSync(handle, buffer, 0, buffer.length, 0)
      if (length !== stat.size) {
        throw new Error(MODEL_ACCOUNT_LOCKED)
      }
      const parsed = credentialSchema.safeParse(
        JSON.parse(protectedStore().decryptString(buffer.subarray(0, length)))
      )
      if (!parsed.success || parsed.data.provider !== provider) {
        throw new Error(MODEL_ACCOUNT_LOCKED)
      }
      return parsed.data
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return null
      }
      throw new Error(MODEL_ACCOUNT_LOCKED)
    } finally {
      if (handle !== undefined) {
        closeSync(handle)
      }
    }
  }

  account(provider: ForflowModelProvider): ForflowModelAccount {
    try {
      const credential = this.credential(provider)
      return {
        provider,
        state: credential ? 'configured' : 'missing',
        model: credential?.model ?? null
      }
    } catch {
      return { provider, state: 'locked', model: null }
    }
  }

  list(): ForflowModelAccount[] {
    return forflowModelProviderSchema.options.map((provider) => this.account(provider))
  }

  save(input: ForflowModelAccountInput): ForflowModelAccount {
    const parsed = forflowModelAccountInputSchema.safeParse(input)
    if (!parsed.success) {
      throw new Error('账户配置格式无效。')
    }
    try {
      const existing = this.credential(parsed.data.provider)
      const apiKey = parsed.data.apiKey ?? existing?.apiKey
      if (!apiKey) {
        throw new Error(MODEL_ACCOUNT_LOCKED)
      }
      const credential = { ...parsed.data, apiKey }
      const ciphertext = protectedStore().encryptString(JSON.stringify(credential))
      if (!ciphertext.length || ciphertext.length > MAX_RECORD_BYTES) {
        throw new Error(MODEL_ACCOUNT_LOCKED)
      }
      mkdirSync(this.directory, { recursive: true, mode: 0o700 })
      writeCredentialFileAtomic(this.path(credential.provider), ciphertext)
      return { provider: credential.provider, state: 'configured', model: credential.model }
    } catch {
      throw new Error(MODEL_ACCOUNT_LOCKED)
    }
  }

  remove(provider: ForflowModelProvider): void {
    try {
      rmSync(this.path(provider), { force: true })
    } catch {
      throw new Error('无法移除此账户，请稍后重试。')
    }
  }
}
