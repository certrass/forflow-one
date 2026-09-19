import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  trusted: true,
  enabled: true,
  list: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  test: vi.fn()
}))
vi.mock('electron', () => ({
  app: { getPath: () => '/unused-fixture' },
  ipcMain: { handle: mocks.handle }
}))
vi.mock('../ipc/ui', () => ({ isTrustedUIRenderer: () => mocks.trusted }))
vi.mock('./deployment-policy', () => ({ isForflowPrivateDeployment: () => mocks.enabled }))
vi.mock('./model-account-storage', () => ({ ForflowModelAccountStorage: class {} }))
vi.mock('./model-account-client', () => ({
  ForflowModelAccountClient: class {
    list = mocks.list
    save = mocks.save
    remove = mocks.remove
    test = mocks.test
  }
}))
import { registerForflowModelAccountHandlers } from './model-account-ipc'

const frame = {}
const event = { senderFrame: frame, sender: { mainFrame: frame } }
function invoke(operation: string, sender = event, value?: unknown): unknown {
  const handler = mocks.handle.mock.calls.find(
    ([channel]) => channel === `forflow:modelAccounts:${operation}`
  )?.[1]
  if (!handler) {
    throw new Error('Missing handler')
  }
  return handler(sender, value)
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.trusted = true
  mocks.enabled = true
  registerForflowModelAccountHandlers()
})
describe('desktop model account IPC', () => {
  it.each(['list', 'save', 'remove', 'test'])(
    'rejects untrusted %s calls before touching credentials',
    (operation) => {
      mocks.trusted = false
      expect(() => invoke(operation)).toThrow('桌面主界面')
      mocks.trusted = true
      mocks.enabled = false
      expect(() => invoke(operation)).toThrow('桌面主界面')
      mocks.enabled = true
      expect(() => invoke(operation, { ...event, senderFrame: {} })).toThrow('桌面主界面')
      expect(mocks.list).not.toHaveBeenCalled()
      expect(mocks.save).not.toHaveBeenCalled()
      expect(mocks.remove).not.toHaveBeenCalled()
      expect(mocks.test).not.toHaveBeenCalled()
    }
  )
  it('validates inputs without echoing secret, path or Zod details', () => {
    expect(() =>
      invoke('save', event, { provider: 'kimi', model: '/private/secret', apiKey: 'secret\n' })
    ).toThrow(/^账户配置格式无效。$/)
    for (const operation of ['remove', 'test']) {
      expect(() => invoke(operation, event, '../../secret')).toThrow(/^账户提供商无效。$/)
    }
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it('routes validated requests and allows omitted keys for an existing account', () => {
    invoke('save', event, { provider: 'kimi', model: 'test-model' })
    invoke('list')
    invoke('test', event, 'zhipu')
    invoke('remove', event, 'deepseek')
    expect(mocks.save).toHaveBeenCalledWith({ provider: 'kimi', model: 'test-model' })
    expect(mocks.list).toHaveBeenCalledOnce()
    expect(mocks.test).toHaveBeenCalledWith('zhipu')
    expect(mocks.remove).toHaveBeenCalledWith('deepseek')
  })
})
