import {
  JEV_ENDPOINT,
  jevResponseSchema,
  type JevRequest,
  type JevResponse
} from '../../shared/jev-audit-types'
import { readFetchResponseJsonWithinLimit } from '../../shared/fetch-response-body'

export class JevRequestError extends Error {
  constructor(
    message: string,
    readonly outcome: 'rejected' | 'unknown'
  ) {
    super(message)
  }
}

export function validateJevResponse(value: unknown, request: JevRequest): JevResponse {
  const response = jevResponseSchema.safeParse(value)
  const invalid = () =>
    new JevRequestError('Jev 返回格式或版本不符合本次请求，未形成审计建议。', 'unknown')
  if (!response.success || response.data.model !== request.model) {
    throw invalid()
  }
  const { answers } = response.data
  if (Object.keys(answers).length !== Object.keys(request.questions).length) {
    throw invalid()
  }
  for (const [id, question] of Object.entries(request.questions)) {
    const answer = answers[id]
    const options = Object.keys(question.criteria)
    if (
      !answer ||
      !options.includes(answer.choice) ||
      Object.keys(answer.probabilities).length !== options.length ||
      options.some((option) => answer.probabilities[option] === undefined)
    ) {
      throw invalid()
    }
    const values = Object.values(answer.probabilities)
    if (
      Math.abs(values.reduce((sum, probability) => sum + probability, 0) - 1) > 0.001 ||
      answer.probabilities[answer.choice] + 0.000001 < Math.max(...values)
    ) {
      throw invalid()
    }
  }
  return response.data
}

export async function requestJev(
  request: JevRequest,
  apiKey: string,
  send: (url: string, init?: RequestInit) => Promise<Response>,
  signal?: AbortSignal
): Promise<JevResponse> {
  const deadline = AbortSignal.timeout(30_000)
  const boundedSignal = signal ? AbortSignal.any([signal, deadline]) : deadline
  try {
    const response = await send(JEV_ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      signal: boundedSignal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(request)
    })
    if (!response.ok) {
      await response.body?.cancel()
      if (response.status === 401 || response.status === 403) {
        throw new JevRequestError('Jev 认证失败，请检查 API Key。', 'rejected')
      }
      if (response.status === 422 || response.status === 429) {
        throw new JevRequestError('Jev 拒绝了请求，请检查模型、额度或稍后手动重试。', 'rejected')
      }
      throw new JevRequestError('Jev 服务未返回可用结果；本次用量未知，未自动重试。', 'unknown')
    }
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      await response.body?.cancel()
      throw new JevRequestError('Jev 返回非 JSON 内容，本次用量未知。', 'unknown')
    }
    const body = await readFetchResponseJsonWithinLimit<unknown>(response, 64 * 1024, {
      structuralTokens: 4096,
      nestingDepth: 16
    })
    boundedSignal.throwIfAborted()
    return validateJevResponse(body, request)
  } catch (error) {
    if (error instanceof JevRequestError) {
      throw error
    }
    throw new JevRequestError(
      boundedSignal.aborted
        ? 'Jev 请求超时或取消；服务端是否完成及用量未知，未自动重试。'
        : 'Jev 请求失败；服务端是否完成及用量未知，未自动重试。',
      'unknown'
    )
  }
}
