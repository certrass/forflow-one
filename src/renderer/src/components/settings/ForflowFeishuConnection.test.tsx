// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { createGlobalSettingsFixture } from '../../../../shared/global-settings-test-fixture'
import { ForflowFeishuConnection } from './ForflowFeishuConnection'

const originalApi = window.api
const originalState = useAppStore.getState()
const connect = vi.fn()
const status = vi.fn()
const disconnect = vi.fn()
beforeEach(() => {
  connect.mockReset()
  disconnect.mockReset()
  status.mockReset().mockResolvedValue({ installed: true, connection: null })
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { forflowFeishu: { status, connect, disconnect } }
  })
  useAppStore.setState({
    settings: createGlobalSettingsFixture({ activeRuntimeEnvironmentId: null })
  })
})
afterEach(() => {
  cleanup()
  useAppStore.setState(originalState, true)
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
})

it('connects existing authorization, recovers from failure and opens tasks', async () => {
  connect.mockRejectedValueOnce(
    new Error("Error invoking remote method 'forflow:feishu:connect': Error: 尚未配置飞书应用。")
  )
  const onBrowse = vi.fn()
  render(<ForflowFeishuConnection onBrowse={onBrowse} />)
  await screen.findByText('未连接')
  expect(screen.queryByText('lark-cli config init')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '连接飞书' }))
  expect((await screen.findByRole('alert')).textContent).toBe('尚未配置飞书应用。')
  connect.mockResolvedValueOnce({
    installed: true,
    connection: { appId: 'cli_test', userId: 'ou_test', userName: '测试用户' }
  })
  fireEvent.click(screen.getByRole('button', { name: '连接飞书' }))
  await screen.findByText('测试用户')
  expect(screen.queryByRole('alert')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '查看任务' }))
  expect(onBrowse).toHaveBeenCalledOnce()
})

it('opens setup for a missing tool without calling connect and validates the selected app', async () => {
  status.mockResolvedValueOnce({ installed: false, connection: null })
  render(<ForflowFeishuConnection />)
  await screen.findByText('未连接')
  fireEvent.click(screen.getByRole('button', { name: '连接飞书' }))
  await screen.findByText('lark-cli config init')
  expect(connect).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('使用其他飞书应用'))
  const profile = screen.getByRole('textbox')
  fireEvent.change(profile, { target: { value: 'cli_existing' } })
  expect(screen.getByText(/lark-cli --profile cli_existing auth login/)).toBeTruthy()
  fireEvent.change(profile, { target: { value: 'cli_bad;echo secret' } })
  fireEvent.click(screen.getByRole('button', { name: '连接飞书' }))
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('应用 ID 应以 cli_ 开头')
  )
  expect(connect).not.toHaveBeenCalled()
})

it('does not read local credentials from a remote settings scope', async () => {
  useAppStore.setState({
    settings: createGlobalSettingsFixture({ activeRuntimeEnvironmentId: 'server-a' })
  })
  render(<ForflowFeishuConnection />)
  await screen.findByText('请切回本机')
  expect(status).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: '连接飞书' })).toBeNull()
})

it('ignores a connection result after the user switches to a remote host', async () => {
  let finish: ((value: unknown) => void) | undefined
  connect.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  render(<ForflowFeishuConnection />)
  await screen.findByText('未连接')
  fireEvent.click(screen.getByRole('button', { name: '连接飞书' }))
  fireEvent.click(screen.getByRole('button', { name: '正在连接…' }))
  expect(connect).toHaveBeenCalledOnce()
  useAppStore.setState({
    settings: createGlobalSettingsFixture({ activeRuntimeEnvironmentId: 'server-a' })
  })
  await screen.findByText('请切回本机')
  finish?.({
    installed: true,
    connection: { appId: 'cli_test', userId: 'ou_test', userName: '旧本机账号' }
  })
  await waitFor(() => expect(screen.queryByText('旧本机账号')).toBeNull())
})
