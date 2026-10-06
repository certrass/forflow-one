import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  read: vi.fn(),
  trusted: true,
  enabled: true,
  runtime: 'host'
}))
vi.mock('electron', () => ({ ipcMain: { handle: mocks.handle } }))
vi.mock('../ipc/ui', () => ({ isTrustedUIRenderer: () => mocks.trusted }))
vi.mock('./deployment-policy', () => ({ isForflowPrivateDeployment: () => mocks.enabled }))
vi.mock('../../shared/local-account-runtime', () => ({
  resolveLocalAccountRuntimeTarget: () => ({ runtime: mocks.runtime })
}))
vi.mock('./workbuddy-account-client', () => ({
  WorkBuddyAccountClient: class {
    getStatus = mocks.read
  }
}))
import { getDefaultSettings } from '../../shared/constants'
import { registerForflowWorkBuddyAccountHandlers } from './workbuddy-account-ipc'

const frame = {}
const event = { senderFrame: frame, sender: { mainFrame: frame } }
let settings = getDefaultSettings('/tmp')
function invoke(sender = event): Promise<unknown> {
  return mocks.handle.mock.calls[0][1](sender)
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.trusted = true
  mocks.enabled = true
  mocks.runtime = 'host'
  settings = getDefaultSettings('/tmp')
  mocks.read.mockResolvedValue({ state: 'signed-out' })
  registerForflowWorkBuddyAccountHandlers(() => settings)
})
describe('WorkBuddy account IPC', () => {
  it('rejects untrusted renderers, subframes and non-Forflow deployments', async () => {
    mocks.trusted = false
    await expect(invoke()).rejects.toThrow('桌面主界面')
    mocks.trusted = true
    mocks.enabled = false
    await expect(invoke()).rejects.toThrow('桌面主界面')
    mocks.enabled = true
    await expect(invoke({ ...event, senderFrame: {} })).rejects.toThrow('桌面主界面')
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it('never reads the local account in a remote or WSL scope', async () => {
    settings.activeRuntimeEnvironmentId = 'remote-host'
    expect(await invoke()).toEqual({ state: 'local-only' })
    settings.activeRuntimeEnvironmentId = null
    mocks.runtime = 'wsl'
    expect(await invoke()).toEqual({ state: 'local-only' })
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it('discards a local result after the user switches hosts', async () => {
    mocks.read.mockImplementation(async () => {
      settings.activeRuntimeEnvironmentId = 'remote-host'
      return { state: 'signed-in', name: 'local identity' }
    })
    expect(await invoke()).toEqual({ state: 'local-only' })
  })
})
