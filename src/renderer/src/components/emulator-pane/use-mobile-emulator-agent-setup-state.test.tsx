// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { setRendererUiLanguage } from '@/i18n/i18n'
import type { CliInstallStatus } from '../../../../shared/cli-install-types'
import { useMobileEmulatorAgentSetupState } from './use-mobile-emulator-agent-setup-state'

const mocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  message: vi.fn(),
  getStatus: vi.fn(),
  install: vi.fn(),
  refresh: vi.fn().mockResolvedValue(false)
}))
vi.mock('sonner', () => ({ toast: mocks }))
vi.mock('@/hooks/useInstalledAgentSkills', () => ({
  GLOBAL_AGENT_SKILL_SOURCE_KINDS: ['global'],
  useInstalledAgentSkill: () => ({
    installed: false,
    loading: false,
    error: null,
    refresh: mocks.refresh
  })
}))

const registered: CliInstallStatus = {
  platform: 'darwin',
  commandName: 'forflow',
  commandPath: '/usr/local/bin/forflow',
  pathDirectory: '/usr/local/bin',
  pathConfigured: true,
  launcherPath: '/app/forflow',
  installMethod: 'symlink',
  supported: true,
  state: 'installed',
  currentTarget: '/app/forflow',
  unsupportedReason: null,
  detail: null
}

beforeEach(async () => {
  vi.clearAllMocks()
  await setRendererUiLanguage('zh')
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { cli: { getInstallStatus: mocks.getStatus, install: mocks.install } }
  })
})
afterEach(async () => {
  cleanup()
  await setRendererUiLanguage('en')
})

it('maps permission errors without raw IPC text and blocks registration while status is unknown', async () => {
  mocks.getStatus.mockRejectedValue(
    new Error("Error invoking remote method 'cli:getInstallStatus': EACCES: readlink /private/path")
  )
  const { result } = renderHook(() => useMobileEmulatorAgentSetupState())
  await waitFor(() => expect(result.current.cliLoading).toBe(false))
  expect(mocks.error).toHaveBeenLastCalledWith(expect.stringContaining('没有权限读取命令路径'))
  expect(mocks.error.mock.calls.flat().join()).not.toMatch(/EACCES|remote method|private\/path/)
  expect(result.current.cliInstallStatus).toBeNull()
  await act(async () => {
    await result.current.handleEnableCli()
  })
  expect(mocks.install).not.toHaveBeenCalled()
  expect(mocks.getStatus).toHaveBeenCalledTimes(1)
  mocks.getStatus.mockResolvedValue(registered)
  await act(async () => {
    await result.current.recheckSetup()
  })
  expect(result.current.cliEnabled).toBe(true)
})

it('clears stale CLI readiness when rechecking fails, and recovers on retry', async () => {
  mocks.getStatus.mockResolvedValue(registered)
  const { result } = renderHook(() => useMobileEmulatorAgentSetupState())
  await waitFor(() => expect(result.current.cliEnabled).toBe(true))
  mocks.getStatus.mockRejectedValue(new Error('IPC unavailable'))
  await act(async () => {
    await result.current.recheckSetup()
  })
  expect(result.current.cliInstallStatus).toBeNull()
  expect(result.current.cliEnabled).toBe(false)
  expect(mocks.error).toHaveBeenLastCalledWith(expect.stringContaining('无法读取命令注册状态'))
  await act(async () => {
    await result.current.handleEnableCli()
  })
  expect(mocks.install).not.toHaveBeenCalled()
  mocks.getStatus.mockResolvedValue(registered)
  await act(async () => {
    await result.current.recheckSetup()
  })
  expect(result.current.cliEnabled).toBe(true)
})
