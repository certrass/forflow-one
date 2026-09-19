import { afterEach, describe, expect, it, vi } from 'vitest'
import { runModelProbe, validateModelEndpoint } from './forflow-model-probe.mjs'
afterEach(() => vi.unstubAllGlobals())

describe('Forflow model probe', () => {
  it('accepts Beijing and explicit loopback profiles, refuses foreign endpoints or credentials in URLs', () => {
    expect(
      validateModelEndpoint(
        'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
        'cn-api'
      ).pathname
    ).toBe('/compatible-mode/v1/chat/completions')
    expect(validateModelEndpoint('http://127.0.0.1:8080/v1', 'intranet').hostname).toBe('127.0.0.1')
    for (const url of [
      'https://dashscope-intl.aliyuncs.com/v1',
      'https://api.openai.com/v1',
      'https://dashscope.aliyuncs.com.evil.test/v1',
      'http://dashscope.aliyuncs.com/v1',
      'https://user:secret@dashscope.aliyuncs.com/v1'
    ]) {
      expect(() => validateModelEndpoint(url, 'cn-api')).toThrow()
    }
  })

  it('does no network work without explicit endpoint, model and credentials', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect((await runModelProbe({})).status).toBe('not-run')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends only the synthetic probe and refuses redirects without saving model content or credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '连接成功' } }],
          usage: { total_tokens: 12, secret: 'not-for-log' }
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = await runModelProbe({
      FORFLOW_MODEL_BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      FORFLOW_MODEL_ID: 'qwen-plus',
      FORFLOW_MODEL_API_KEY: 'synthetic-secret'
    })
    expect(result.status).toBe('passed')
    expect(result.usage).toEqual({ total_tokens: 12 })
    expect(fetchMock.mock.calls[0][1].redirect).toBe('error')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages).toEqual([
      { role: 'user', content: '请只回复：连接成功' }
    ])
    expect(JSON.stringify(result)).not.toMatch(/synthetic-secret|连接成功|not-for-log/)
  })

  it('does not mistake an HTTP success without assistant text for a model success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')))
    expect(
      (
        await runModelProbe(
          {
            FORFLOW_MODEL_BASE_URL: 'http://127.0.0.1:8080/v1',
            FORFLOW_MODEL_ID: 'local',
            FORFLOW_MODEL_API_KEY: 'synthetic'
          },
          'intranet'
        )
      ).status
    ).toBe('invalid-response')
  })
})
