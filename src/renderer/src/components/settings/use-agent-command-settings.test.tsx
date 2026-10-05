// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultSettings } from '../../../../shared/constants'
import { useAgentCommandSettings } from './use-agent-command-settings'

const mocks = vi.hoisted(() => ({ error: vi.fn(), clearLocal: vi.fn(), clearRuntime: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))
vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => ({
      settings: null,
      clearLocalDetectedAgents: mocks.clearLocal,
      clearRuntimeDetectedAgents: mocks.clearRuntime
    })
  }
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('saving commands before detection', () => {
  it('waits for persistence before probing and stays busy through detection', async () => {
    let persisted!: () => void
    let detected!: () => void
    const update = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          persisted = resolve
        })
    )
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          detected = resolve
        })
    )
    const { result } = renderHook(() =>
      useAgentCommandSettings(getDefaultSettings('/tmp'), update, refresh)
    )
    let save!: Promise<void>
    await act(async () => {
      save = result.current.saveCommand('codebuddy', '/opt/codebuddy')
    })
    expect(result.current.isSaving).toBe(true)
    expect(refresh).not.toHaveBeenCalled()
    expect(mocks.clearLocal).not.toHaveBeenCalled()
    await act(async () => {
      persisted()
    })
    expect(refresh).toHaveBeenCalledOnce()
    expect(mocks.clearLocal).toHaveBeenCalledOnce()
    expect(mocks.clearRuntime).not.toHaveBeenCalled()
    expect(result.current.isSaving).toBe(true)
    await act(async () => {
      detected()
      await save
    })
    expect(result.current.isSaving).toBe(false)
  })

  it('reports a failed save without probing or including private values', async () => {
    const refresh = vi.fn()
    const update = vi.fn().mockRejectedValue(new Error('/private/account-name'))
    const { result } = renderHook(() =>
      useAgentCommandSettings(getDefaultSettings('/tmp'), update, refresh)
    )
    await act(async () => {
      await result.current.saveCommand('codebuddy', '/private/account-name')
    })
    expect(refresh).not.toHaveBeenCalled()
    expect(result.current.isSaving).toBe(false)
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith('Unable to save the agent command.')
  })

  it('distinguishes detection failure after a successful save', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const refresh = vi.fn().mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() =>
      useAgentCommandSettings(getDefaultSettings('/tmp'), update, refresh)
    )
    await act(async () => {
      await result.current.saveCommand('qoder-cn', '/opt/qodercn')
    })
    expect(update).toHaveBeenCalledExactlyOnceWith({
      agentCmdOverrides: { 'qoder-cn': '/opt/qodercn' }
    })
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith(
      'Command saved. Detection failed; retry Refresh before launching.'
    )
    expect(result.current.isSaving).toBe(false)
  })
})
