// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { setRendererUiLanguage } from '@/i18n/i18n'
import { useMobileEmulatorAgentSetupState } from './use-mobile-emulator-agent-setup-state'

const mocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  message: vi.fn(),
  getStatus: vi.fn(),
  install: vi.fn(),
  refresh: vi.fn(),
  skill: { installed: true, loading: false, error: null }
}))
vi.mock('sonner', () => ({ toast: mocks }))
vi.mock('@/hooks/useInstalledAgentSkills', () => ({
  GLOBAL_AGENT_SKILL_SOURCE_KINDS: ['global'],
  useInstalledAgentSkill: () => ({ ...mocks.skill, refresh: mocks.refresh })
}))
beforeEach(async () => {
  vi.clearAllMocks()
  mocks.refresh.mockResolvedValue(true)
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

it('uses the installed skill with the managed terminal command without a second CLI registration', async () => {
  const { result } = renderHook(() => useMobileEmulatorAgentSetupState())
  expect(result.current.setupComplete).toBe(true)
  await act(async () => {
    await result.current.recheckSetup()
  })
  expect(mocks.refresh).toHaveBeenCalledOnce()
  expect(mocks.getStatus).not.toHaveBeenCalled()
  expect(mocks.install).not.toHaveBeenCalled()
})

it('withholds stale readiness after a failed skill read and recovers on retry', async () => {
  const { result } = renderHook(() => useMobileEmulatorAgentSetupState())
  mocks.refresh.mockRejectedValueOnce(new Error('EACCES: /private/path'))
  await act(async () => {
    await result.current.recheckSetup()
  })
  expect(result.current.setupComplete).toBe(false)
  expect(result.current.cliSkillError).toBe('无法读取技能状态，请重试。')
  expect(mocks.error.mock.calls.flat().join()).not.toMatch(/EACCES|private\/path/)
  await act(async () => {
    await result.current.recheckSetup()
  })
  expect(result.current.setupComplete).toBe(true)
  expect(result.current.cliSkillError).toBeNull()
})
