import { z } from 'zod'
import { parseIdentityResponse, readIdentityResponse } from './identity-response'
import type { ForflowIdentityStorage } from './identity-storage'
import { normalizeForflowServiceUrl } from '../../shared/forflow-service-policy'
import {
  forflowLoginSchema,
  forflowSessionSchema,
  forflowUserSchema,
  forflowAuditSchema,
  type ForflowIdentityApi,
  type ForflowIdentityStatus
} from '../../shared/forflow-identity'

class IdentityRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

export class ForflowIdentityClient implements ForflowIdentityApi {
  private generation = 0
  constructor(private readonly storage: ForflowIdentityStorage) {}

  private async request(
    serverUrl: string,
    path: string,
    body?: unknown,
    token?: string
  ): Promise<unknown> {
    let response: Response
    try {
      response = await fetch(`${normalizeForflowServiceUrl(serverUrl)}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store'
      })
    } catch {
      throw new Error('无法连接 Forflow 身份服务，请检查服务地址、网络和证书。')
    }
    const data = await readIdentityResponse(response)
    if (!response.ok) {
      const result = z.object({ error: z.string().max(300) }).safeParse(data)
      throw new IdentityRequestError(
        response.status,
        result.success ? result.data.error : '身份服务请求失败。'
      )
    }
    return data
  }

  async status(): Promise<ForflowIdentityStatus> {
    const serverUrl = this.storage.serverUrl()
    const stored = serverUrl ? this.storage.token(serverUrl) : null
    const base = { serverUrl, session: null, persistence: 'none' } as const
    if (!serverUrl) {
      return { ...base, state: 'local' }
    }
    if (!stored) {
      return { ...base, state: 'signed-out' }
    }
    const generation = this.generation
    try {
      const session = parseIdentityResponse(
        forflowSessionSchema,
        await this.request(serverUrl, '/v1/identity/session', undefined, stored.token)
      )
      if (generation !== this.generation) {
        return this.status()
      }
      return { serverUrl, session, persistence: stored.persistence, state: 'connected' }
    } catch (error) {
      if (generation !== this.generation) {
        return this.status()
      }
      if (error instanceof IdentityRequestError && error.status === 401) {
        this.storage.clearToken()
        return { ...base, state: 'signed-out', error: error.message }
      }
      return {
        ...base,
        state: 'unavailable',
        error: error instanceof Error ? error.message : '身份服务暂时不可用。'
      }
    }
  }

  async configure(value: string | null): Promise<ForflowIdentityStatus> {
    const serverUrl = value ? normalizeForflowServiceUrl(value) : null
    const generation = ++this.generation
    if (serverUrl) {
      const response = await this.request(serverUrl, '/v1/identity/config')
      parseIdentityResponse(
        z.object({
          product: z.literal('Forflow One'),
          contract: z.literal(1),
          authentication: z.literal('password')
        }),
        response
      )
    }
    if (generation !== this.generation) {
      throw new Error('配置已改变，请重新操作。')
    }
    const oldUrl = this.storage.serverUrl()
    const oldSession = oldUrl ? this.storage.token(oldUrl) : null
    this.storage.configure(serverUrl)
    if (oldUrl && oldSession) {
      await this.request(oldUrl, '/v1/identity/logout', {}, oldSession.token).catch(() => undefined)
    }
    return this.status()
  }

  async login(
    credentials: Parameters<ForflowIdentityApi['login']>[0]
  ): Promise<ForflowIdentityStatus> {
    const serverUrl = this.storage.serverUrl()
    if (!serverUrl) {
      throw new Error('请先配置 Forflow 身份服务地址。')
    }
    const generation = ++this.generation
    const previous = this.storage.token(serverUrl)
    const result = parseIdentityResponse(
      forflowLoginSchema,
      await this.request(serverUrl, '/v1/identity/login', credentials)
    )
    if (generation !== this.generation || serverUrl !== this.storage.serverUrl()) {
      await this.request(serverUrl, '/v1/identity/logout', {}, result.token).catch(() => undefined)
      throw new Error('登录配置已改变，请重新登录。')
    }
    this.storage.saveToken(serverUrl, result.token)
    if (previous) {
      await this.request(serverUrl, '/v1/identity/logout', {}, previous.token).catch(
        () => undefined
      )
    }
    return this.status()
  }

  async logout(): Promise<ForflowIdentityStatus> {
    this.generation += 1
    const serverUrl = this.storage.serverUrl()
    const stored = serverUrl ? this.storage.token(serverUrl) : null
    this.storage.clearToken()
    if (serverUrl && stored) {
      try {
        await this.request(serverUrl, '/v1/identity/logout', {}, stored.token)
      } catch {
        return {
          serverUrl,
          state: 'signed-out',
          session: null,
          persistence: 'none',
          error: '本机会话已清除；服务暂不可达，远端会话将在超时后失效。'
        }
      }
    }
    return this.status()
  }

  private async authorized(path: string, body?: unknown): Promise<unknown> {
    const serverUrl = this.storage.serverUrl()
    const stored = serverUrl ? this.storage.token(serverUrl) : null
    if (!serverUrl || !stored) {
      throw new Error('请先登录 Forflow 账号。')
    }
    return this.request(serverUrl, path, body, stored.token)
  }

  async users(): ReturnType<ForflowIdentityApi['users']> {
    return parseIdentityResponse(
      z.object({ users: z.array(forflowUserSchema).max(10000) }),
      await this.authorized('/v1/admin/users')
    ).users
  }
  async createUser(
    input: Parameters<ForflowIdentityApi['createUser']>[0]
  ): ReturnType<ForflowIdentityApi['createUser']> {
    return parseIdentityResponse(
      z.object({ user: forflowUserSchema }),
      await this.authorized('/v1/admin/users', input)
    ).user
  }
  async setUserDisabled(
    input: Parameters<ForflowIdentityApi['setUserDisabled']>[0]
  ): Promise<void> {
    await this.authorized('/v1/admin/users/state', input)
  }
  async resetPassword(input: Parameters<ForflowIdentityApi['resetPassword']>[0]): Promise<void> {
    await this.authorized('/v1/admin/users/password', input)
  }
  async audit(): ReturnType<ForflowIdentityApi['audit']> {
    return parseIdentityResponse(forflowAuditSchema, await this.authorized('/v1/admin/audit'))
  }
}
