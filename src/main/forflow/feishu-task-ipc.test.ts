import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  trusted: true,
  enabled: true,
  status: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  tasklists: vi.fn(),
  tasks: vi.fn(),
  task: vi.fn()
}))
vi.mock('electron', () => ({
  app: { getPath: () => '/unused-fixture' },
  ipcMain: { handle: mocks.handle }
}))
vi.mock('../ipc/ui', () => ({ isTrustedUIRenderer: () => mocks.trusted }))
vi.mock('./deployment-policy', () => ({ isForflowPrivateDeployment: () => mocks.enabled }))
vi.mock('./feishu-task-client', () => ({
  FeishuTaskClient: class {
    status = mocks.status
    connect = mocks.connect
    disconnect = mocks.disconnect
    tasklists = mocks.tasklists
    tasks = mocks.tasks
    task = mocks.task
  }
}))
import { registerForflowFeishuHandlers } from './feishu-task-ipc'

const frame = {}
const event = { senderFrame: frame, sender: { mainFrame: frame } }
function invoke(operation: string, sender = event, value?: unknown): unknown {
  const handler = mocks.handle.mock.calls.find(
    ([channel]) => channel === `forflow:feishu:${operation}`
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
  registerForflowFeishuHandlers()
})
describe('desktop Feishu read-only IPC', () => {
  it.each(['status', 'connect', 'disconnect', 'tasklists', 'tasks', 'task'])(
    'rejects untrusted %s calls before touching credentials',
    (operation) => {
      mocks.trusted = false
      expect(() => invoke(operation)).toThrow('桌面主界面')
      mocks.trusted = true
      mocks.enabled = false
      expect(() => invoke(operation)).toThrow('桌面主界面')
      mocks.enabled = true
      expect(() => invoke(operation, { ...event, senderFrame: {} })).toThrow('桌面主界面')
      for (const method of [
        mocks.status,
        mocks.connect,
        mocks.disconnect,
        mocks.tasklists,
        mocks.tasks,
        mocks.task
      ]) {
        expect(method).not.toHaveBeenCalled()
      }
    }
  )
  it('rejects malformed input without reflecting paths or secret values', () => {
    for (const operation of ['connect', 'task', 'tasklists', 'tasks']) {
      expect(() => invoke(operation, event, { secret: '/private/token' })).toThrow('参数格式无效')
    }
    expect(mocks.tasks).not.toHaveBeenCalled()
  })
  it('routes only the explicit typed read operations', () => {
    invoke('connect', event, 'cli_test')
    invoke('tasks', event, { tasklistId: 'list-1', completed: false })
    invoke('task', event, 'task-1')
    expect(mocks.connect).toHaveBeenCalledWith('cli_test')
    expect(mocks.tasks).toHaveBeenCalledWith({ tasklistId: 'list-1', completed: false })
    expect(mocks.task).toHaveBeenCalledWith('task-1')
  })
})
