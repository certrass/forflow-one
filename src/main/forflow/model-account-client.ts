import { z } from 'zod'
import {
  FORFLOW_MODEL_PROVIDERS,
  type ForflowModelAccount,
  type ForflowModelAccountInput,
  type ForflowModelProvider,
  type ForflowModelTestResult
} from '../../shared/forflow-model-accounts'
import { readFetchResponseJsonWithinLimit } from '../../shared/fetch-response-body'
import type { ForflowModelAccountStorage } from './model-account-storage'

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullish(),
          reasoning_content: z.string().nullish()
        }),
        finish_reason: z.string().nullish()
      })
    )
    .min(1)
})
const TEST_TIMEOUT_MS = 15_000
const MAX_RESPONSE_BYTES = 64 * 1024

function result(ok: boolean, message: string): ForflowModelTestResult {
  return { ok, message, checkedAt: new Date().toISOString() }
}

function httpFailure(status: number): ForflowModelTestResult {
  if (status === 401 || status === 403) {
    return result(false, '认证失败，请检查 API Key 和账户权限。')
  }
  if (status === 429) {
    return result(false, '请求受到限制，请检查额度或稍后重试。')
  }
  if (status >= 500) {
    return result(false, '提供商服务暂时不可用，请稍后重试。')
  }
  return result(false, '提供商拒绝了连接测试，请检查模型名称和账户权限。')
}

type PendingTest = { controller: AbortController; promise: Promise<ForflowModelTestResult> }
export class ForflowModelAccountClient {
  private readonly pending = new Map<ForflowModelProvider, PendingTest>()
  constructor(
    private readonly storage: ForflowModelAccountStorage,
    private readonly request: typeof fetch = fetch
  ) {}

  list(): ForflowModelAccount[] {
    return this.storage.list()
  }

  save(input: ForflowModelAccountInput): ForflowModelAccount {
    const account = this.storage.save(input)
    this.invalidate(input.provider)
    return account
  }

  remove(provider: ForflowModelProvider): void {
    this.storage.remove(provider)
    this.invalidate(provider)
  }

  private invalidate(provider: ForflowModelProvider): void {
    this.pending.get(provider)?.controller.abort()
    this.pending.delete(provider)
  }

  test(provider: ForflowModelProvider): Promise<ForflowModelTestResult> {
    const existing = this.pending.get(provider)
    if (existing) {
      return existing.promise
    }
    const controller = new AbortController()
    const promise = this.performTest(provider, controller).finally(() => {
      if (this.pending.get(provider)?.controller === controller) {
        this.pending.delete(provider)
      }
    })
    this.pending.set(provider, { controller, promise })
    return promise
  }

  private async performTest(
    provider: ForflowModelProvider,
    controller: AbortController
  ): Promise<ForflowModelTestResult> {
    const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS)
    try {
      const credential = this.storage.credential(provider)
      if (!credential) {
        return result(false, '请先保存此提供商的账户。')
      }
      const response = await this.request(
        `${FORFLOW_MODEL_PROVIDERS[provider].baseUrl}/chat/completions`,
        {
          method: 'POST',
          redirect: 'error',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${credential.apiKey}`
          },
          body: JSON.stringify({
            model: credential.model,
            messages: [{ role: 'user', content: 'Reply with OK.' }],
            max_tokens: 32,
            stream: false
          })
        }
      )
      if (!response.ok) {
        await response.body?.cancel()
        return httpFailure(response.status)
      }
      if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
        await response.body?.cancel()
        return result(false, '提供商返回了非预期响应，未确认连接成功。')
      }
      const parsed = responseSchema.safeParse(
        await readFetchResponseJsonWithinLimit<unknown>(response, MAX_RESPONSE_BYTES, {
          structuralTokens: 4096,
          nestingDepth: 16
        })
      )
      if (controller.signal.aborted) {
        return result(false, '连接测试已超时或取消，请重试。')
      }
      if (!parsed.success) {
        return result(false, '提供商返回了非预期响应，未确认连接成功。')
      }
      const message = parsed.data.choices[0].message
      if (!message.content?.trim() && !message.reasoning_content?.trim()) {
        return result(false, '提供商返回了空响应，未确认连接成功。')
      }
      return result(true, '提供商已接受请求并返回内容（可能仅含推理或因测试长度限制而截断）。')
    } catch {
      return result(
        false,
        controller.signal.aborted
          ? '连接测试已超时或取消，请重试。'
          : '连接测试失败，请检查账户配置和网络后重试。'
      )
    } finally {
      clearTimeout(timer)
    }
  }
}
