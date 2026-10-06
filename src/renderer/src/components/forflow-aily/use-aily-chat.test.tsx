// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ForflowAilyApi, AilyMessage } from '../../../../shared/forflow-aily'
import { mergeAilyMessages, useAilyChat } from './use-aily-chat'

const originalApi = window.api
const connection = {
  profile: 'cli_test',
  userId: 'ou_1',
  partner: { chatId: 'oc_test', name: '测试的智能伙伴', botAppId: 'cli_bot', botMemberId: 'ou_bot' }
}
let api: ForflowAilyApi
beforeEach(() => {
  api = {
    status: vi.fn(async () => ({ installed: true, connection })),
    discover: vi.fn(async () => ({ partners: [connection.partner], hasMore: false })),
    connect: vi.fn(async () => connection),
    disconnect: vi.fn(async () => {}),
    messages: vi.fn(async () => ({ messages: [], olderPageToken: null })),
    send: vi.fn(async () => ({ messageId: 'om_sent' }))
  }
  Object.defineProperty(window, 'api', { configurable: true, value: { forflowAily: api } })
})
afterEach(() => {
  cleanup()
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
})

it('refreshes the connected conversation without sending automatically', async () => {
  const { result } = renderHook(() => useAilyChat())
  await waitFor(() => expect(result.current.connection).toEqual(connection))
  await waitFor(() => expect(api.messages).toHaveBeenCalledOnce())
  expect(api.send).not.toHaveBeenCalled()
})

it('reuses the delivery key after an uncertain failure and prevents duplicate clicks', async () => {
  const { result } = renderHook(() => useAilyChat())
  await waitFor(() => expect(result.current.connection).toEqual(connection))
  vi.mocked(api.send).mockRejectedValueOnce(new Error('timeout'))
  await act(async () => {
    expect(await result.current.send('测试')).toBe(false)
  })
  await act(async () => {
    await Promise.all([result.current.send('测试'), result.current.send('测试')])
  })
  expect(api.send).toHaveBeenCalledTimes(2)
  expect(vi.mocked(api.send).mock.calls[0][0]).toEqual(vi.mocked(api.send).mock.calls[1][0])
})

it('updates streamed card text without losing older pages or duplicating messages', () => {
  const message = (id: string, text = id): AilyMessage => ({
    id,
    text,
    role: 'assistant',
    time: ''
  })
  expect(
    mergeAilyMessages([message('1'), message('2')], [message('2', 'updated'), message('3')])
  ).toEqual([message('1'), message('2', 'updated'), message('3')])
  expect(mergeAilyMessages([message('2')], [message('1')], true)).toEqual([
    message('1'),
    message('2')
  ])
})
