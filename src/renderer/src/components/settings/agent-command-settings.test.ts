import { describe, expect, it, vi } from 'vitest'
import { getDefaultSettings } from '../../../../shared/constants'
import type { GlobalSettings } from '../../../../shared/global-settings-types'
import { createAgentCommandUpdateQueue } from './agent-command-settings'

describe('agent command settings queue', () => {
  it('serializes writes without dropping other agents and removes only the reset override', async () => {
    const enqueue = createAgentCommandUpdateQueue()
    let settings = getDefaultSettings('/tmp')
    const options = {
      getSettings: () => settings,
      fallbackSettings: settings,
      updateSettings: vi.fn(async (update: Partial<GlobalSettings>) => {
        await Promise.resolve()
        settings = { ...settings, ...update }
      })
    }
    await Promise.all([
      enqueue({ ...options, agentId: 'codebuddy', value: ' "/opt/国产工具/codebuddy" ' }),
      enqueue({ ...options, agentId: 'qoder-cn', value: '/opt/qodercn' })
    ])
    expect(settings.agentCmdOverrides).toEqual({
      codebuddy: '"/opt/国产工具/codebuddy"',
      'qoder-cn': '/opt/qodercn'
    })
    await enqueue({ ...options, agentId: 'codebuddy', value: '' })
    expect(settings.agentCmdOverrides).toEqual({ 'qoder-cn': '/opt/qodercn' })
    await enqueue({ ...options, agentId: 'qoder-cn', value: '/opt/qodercn' })
    expect(options.updateSettings).toHaveBeenCalledTimes(3)
  })

  it('surfaces a failed write and permits the next save', async () => {
    const enqueue = createAgentCommandUpdateQueue()
    const settings = getDefaultSettings('/tmp')
    const updateSettings = vi
      .fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValue(undefined)
    const options = {
      getSettings: () => settings,
      fallbackSettings: settings,
      updateSettings,
      agentId: 'codebuddy' as const,
      value: '/opt/codebuddy'
    }
    await expect(enqueue(options)).rejects.toThrow('disk full')
    await expect(enqueue(options)).resolves.toBeUndefined()
    expect(updateSettings).toHaveBeenCalledTimes(2)
  })

  it('finishes detection for a saved path before replacing it with a newer edit', async () => {
    const enqueue = createAgentCommandUpdateQueue()
    let settings = getDefaultSettings('/tmp')
    let finishDetection!: () => void
    const updateSettings = vi.fn(async (update: Partial<GlobalSettings>) => {
      settings = { ...settings, ...update }
    })
    const afterSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDetection = resolve
        })
    )
    const options = {
      getSettings: () => settings,
      fallbackSettings: settings,
      updateSettings,
      agentId: 'codebuddy' as const
    }
    const first = enqueue({ ...options, value: '/opt/first', afterSave })
    const second = enqueue({ ...options, value: '/opt/second' })
    await vi.waitFor(() => expect(afterSave).toHaveBeenCalledOnce())
    expect(settings.agentCmdOverrides?.codebuddy).toBe('/opt/first')
    expect(updateSettings).toHaveBeenCalledTimes(1)
    finishDetection()
    await Promise.all([first, second])
    expect(settings.agentCmdOverrides?.codebuddy).toBe('/opt/second')
  })
})
