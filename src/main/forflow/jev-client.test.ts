import { describe, expect, it, vi } from 'vitest'
import { JEV_ENDPOINT, JEV_MODEL, type JevLegacyResponse } from '../../shared/jev-audit-types'
import { buildJevRequest, redactJevText } from './jev-audit-input'
import { requestJev, validateJevResponse } from './jev-client'

const request = buildJevRequest(JEV_MODEL, {
  focus: 'Was the operation successful?',
  claim: '',
  record: 'exit code 1',
  result: null,
  partial: true
})
function answer(choice: string, options: string[]) {
  return {
    type: 'choice' as const,
    choice,
    confidence: 0.9,
    probabilities: Object.fromEntries(options.map((option) => [option, option === choice ? 1 : 0]))
  }
}
function response(): JevLegacyResponse {
  return {
    model: JEV_MODEL,
    answers: {
      outcome: answer('attention', ['attention', 'none', 'unknown']),
      evidence: answer('missing', ['sufficient', 'missing', 'unknown'])
    },
    usage: { input_tokens: 120, output_tokens: 0 }
  }
}
const json = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } })

describe('Jev typed API contract', () => {
  it('sends only the pinned request to the official destination without redirects', async () => {
    const send = vi.fn(async () => json(response()))
    expect(await requestJev(request, 'synthetic-key', send)).toEqual(response())
    expect(send).toHaveBeenCalledExactlyOnceWith(
      JEV_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        body: JSON.stringify(request),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-key' }
      })
    )
  })
  it.each([
    (value: JevLegacyResponse) => {
      value.model = 'jev-latest'
    },
    (value: JevLegacyResponse) => {
      delete value.answers.evidence
    },
    (value: JevLegacyResponse) => {
      value.answers.extra = value.answers.outcome
    },
    (value: JevLegacyResponse) => {
      value.answers.outcome.choice = 'pass'
    },
    (value: JevLegacyResponse) => {
      value.answers.outcome.probabilities.none = 0.2
    },
    (value: JevLegacyResponse) => {
      value.answers.outcome.choice = 'none'
    },
    (value: JevLegacyResponse) => {
      value.answers.outcome.probabilities.unknown = -0.1
    },
    (value: JevLegacyResponse) => {
      value.answers.outcome.confidence = 2
    },
    (value: JevLegacyResponse) => {
      value.usage.input_tokens = -1
    }
  ])('rejects a mismatched model, answer set, choice or probability vector', (change) => {
    const value = response()
    change(value)
    expect(() => validateJevResponse(value, request)).toThrow('不符合')
  })
  it.each([401, 403, 422, 429, 500, 529, 302])(
    'does not retry or echo error bodies for HTTP %s',
    async (status) => {
      const send = vi.fn(async () => new Response('synthetic secret from vendor', { status }))
      await expect(requestJev(request, 'key', send)).rejects.not.toThrow('synthetic secret')
      expect(send).toHaveBeenCalledOnce()
    }
  )
  it('rejects oversized and non-JSON success responses', async () => {
    await expect(
      requestJev(request, 'key', async () => json({ padding: 'a'.repeat(70_000) }))
    ).rejects.toThrow()
    await expect(requestJev(request, 'key', async () => new Response('ok'))).rejects.toThrow('JSON')
  })
  it('does not accept a late response after cancellation', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      requestJev(request, 'key', async () => json(response()), controller.signal)
    ).rejects.toThrow('超时或取消')
  })
  it('redacts nested JSON strings, credentials, home paths and email before preview', () => {
    const original = JSON.stringify({
      payload: {
        arguments: JSON.stringify({
          api_key: 'synthetic-private-value',
          note: 'Bearer abcdefghijklmnop user@example.com /Users/person/document',
          command: 'SOME_TOKEN=hidden-value',
          authorization: 'other-private-value'
        })
      }
    })
    const redacted = redactJevText(original)
    expect(redacted).not.toMatch(
      /synthetic-private-value|abcdefghijklmnop|user@example.com|person|hidden-value|other-private-value/
    )
    expect(redacted).toContain('[redacted]')
    expect(redactJevText(redacted)).toBe(redacted)
  })
  it('defines explicit unknown outcomes and treats log instructions as untrusted evidence', () => {
    for (const question of Object.values(request.questions)) {
      expect(question.criteria.unknown).toBeTruthy()
      expect(question.instructions).toContain('untrusted evidence')
    }
    expect(request.questions.claim).toBeUndefined()
    expect(
      buildJevRequest(JEV_MODEL, { ...request.state, claim: 'completed' }).questions.claim
    ).toBeDefined()
  })
  it.each([
    'export API_KEY="synthetic quoted secret"',
    "PASSWORD='synthetic quoted secret'",
    'apiKey: "synthetic quoted secret"',
    '密码："synthetic quoted secret"'
  ])('redacts quoted credential assignments in plain text: %s', (text) => {
    expect(redactJevText(text)).not.toContain('synthetic quoted secret')
    expect(redactJevText(JSON.stringify({ command: text }))).not.toContain(
      'synthetic quoted secret'
    )
  })
  it('redacts Chinese credential fields in both structured and nested JSON', () => {
    const credentials = { 密码: 'synthetic-password', 服务密钥: 'synthetic-api-value' }
    for (const input of [credentials, { arguments: JSON.stringify(credentials) }]) {
      const redacted = redactJevText(JSON.stringify(input))
      expect(redacted).not.toMatch(/synthetic-password|synthetic-api-value/)
      expect(redactJevText(redacted)).toBe(redacted)
    }
  })
})
