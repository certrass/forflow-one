// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { createGlobalSettingsFixture } from '../../../../shared/global-settings-test-fixture'
import { ForflowFeishuConnection } from './ForflowFeishuConnection'

const originalApi = window.api
const originalState = useAppStore.getState()
const connect = vi.fn()
beforeEach(() => {
  connect.mockReset()
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      forflowFeishu: { status: async () => ({ installed: true, connection: null }), connect }
    }
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

it('explains configuration failure without an IPC wrapper and supports retry', async () => {
  connect.mockRejectedValueOnce(
    new Error("Error invoking remote method 'forflow:feishu:connect': Error: 尚未配置飞书应用。")
  )
  render(<ForflowFeishuConnection />)
  await screen.findByText('官方 CLI 已检测到；仍需完成应用配置和个人授权。')
  fireEvent.click(screen.getByRole('button', { name: '连接本机飞书' }))
  expect((await screen.findByRole('alert')).textContent).toBe('尚未配置飞书应用。')
  connect.mockResolvedValueOnce({
    installed: true,
    connection: { appId: 'cli_test', userId: 'ou_test', userName: '测试用户' }
  })
  fireEvent.click(screen.getByRole('button', { name: '连接本机飞书' }))
  await screen.findByText('已绑定 · 测试用户')
  expect(screen.queryByRole('alert')).toBeNull()
})

it('keeps existing-app setup available and targets personal authorization to the selected profile', async () => {
  render(<ForflowFeishuConnection />)
  await screen.findByText('lark-cli config init')
  const profile = screen.getByRole('textbox')
  fireEvent.change(profile, { target: { value: 'cli_existing' } })
  expect(screen.getByText(/lark-cli --profile cli_existing auth login/)).toBeTruthy()
  fireEvent.change(profile, { target: { value: 'cli_bad;echo secret' } })
  fireEvent.click(screen.getByRole('button', { name: '连接本机飞书' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('应用 ID 格式不正确'))
  expect(connect).not.toHaveBeenCalled()
})
