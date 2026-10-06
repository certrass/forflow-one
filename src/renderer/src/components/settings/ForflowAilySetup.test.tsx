// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { createGlobalSettingsFixture } from '../../../../shared/global-settings-test-fixture'
import { ForflowAilySetup } from './ForflowAilySetup'

const originalApi = window.api
const originalState = useAppStore.getState()
const status = vi.fn()
const discover = vi.fn()
const connect = vi.fn()
const disconnect = vi.fn()
const partner = {
  name: '项目助手',
  chatId: 'oc_project',
  botAppId: 'cli_aily',
  botMemberId: 'bot_project'
}
const binding = { profile: 'cli_app', userId: 'ou_user', partner }
beforeEach(() => {
  vi.clearAllMocks()
  status.mockResolvedValue({ installed: true, connection: null })
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { forflowAily: { status, discover, connect, disconnect } }
  })
  useAppStore.setState({
    settings: createGlobalSettingsFixture({
      activeRuntimeEnvironmentId: null,
      localAccountRuntime: 'host'
    })
  })
})
afterEach(() => {
  cleanup()
  useAppStore.setState(originalState, true)
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
})
it('connects a discovered partner without requiring a conversation identifier or sending a message', async () => {
  discover.mockResolvedValue({ partners: [partner], hasMore: false })
  connect.mockResolvedValue(binding)
  render(<ForflowAilySetup />)
  fireEvent.click(await screen.findByRole('button', { name: '查找飞书伙伴' }))
  fireEvent.click(await screen.findByRole('button', { name: '连接所选伙伴' }))
  await screen.findByText('已连接 · 项目助手')
  expect(connect).toHaveBeenCalledWith('oc_project')
  expect(screen.queryByText('oc_project')).toBeNull()
  expect(screen.getByRole('button', { name: '更换伙伴' })).toBeTruthy()
})
it('requires a choice with multiple partners and offers recovery for an empty or failed lookup', async () => {
  discover.mockResolvedValueOnce({
    partners: [partner, { ...partner, name: '资料助手', chatId: 'oc_research' }],
    hasMore: true
  })
  render(<ForflowAilySetup />)
  fireEvent.click(await screen.findByRole('button', { name: '查找飞书伙伴' }))
  const submit = await screen.findByRole('button', { name: '连接所选伙伴' })
  expect(submit.hasAttribute('disabled')).toBe(true)
  expect(screen.getByText(/这里只显示部分对话/)).toBeTruthy()
  discover.mockResolvedValueOnce({ partners: [], hasMore: false })
  fireEvent.click(screen.getByRole('button', { name: '刷新伙伴' }))
  await screen.findByText(/还没有找到伙伴/)
  discover.mockRejectedValueOnce(new Error('飞书登录已失效。'))
  fireEvent.click(screen.getByRole('button', { name: '刷新伙伴' }))
  expect((await screen.findByRole('alert')).textContent).toBe('飞书登录已失效。')
  expect(connect).not.toHaveBeenCalled()
})
it.each([{ activeRuntimeEnvironmentId: 'server-a' }, { localAccountRuntime: 'wsl' as const }])(
  'keeps local partner selection out of a different host scope',
  async (settings) => {
    useAppStore.setState({ settings: createGlobalSettingsFixture(settings) })
    render(<ForflowAilySetup />)
    await screen.findByText('切回本机桌面后，即可选择飞书中的伙伴。')
    expect(status).not.toHaveBeenCalled()
  }
)
it('disconnects the selected partner without deleting its Feishu conversation', async () => {
  status.mockResolvedValueOnce({ installed: true, connection: binding })
  disconnect.mockResolvedValue(undefined)
  render(<ForflowAilySetup />)
  await screen.findByText('已连接 · 项目助手')
  fireEvent.click(await screen.findByRole('button', { name: '断开伙伴' }))
  await waitFor(() => expect(screen.queryByText('已连接 · 项目助手')).toBeNull())
  expect(disconnect).toHaveBeenCalledOnce()
  expect(discover).not.toHaveBeenCalled()
})
