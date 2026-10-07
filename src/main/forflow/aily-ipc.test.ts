import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  mkdir: vi.fn(),
  construct: vi.fn(),
  trusted: true,
  enabled: true,
  status: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  discover: vi.fn(),
  messages: vi.fn(),
  send: vi.fn()
}))
vi.mock('node:fs', () => ({ mkdirSync: mocks.mkdir }))
vi.mock('electron', () => ({
  app: { getPath: () => '/unused-fixture' },
  ipcMain: { handle: mocks.handle }
}))
vi.mock('../ipc/ui', () => ({ isTrustedUIRenderer: () => mocks.trusted }))
vi.mock('./deployment-policy', () => ({ isForflowPrivateDeployment: () => mocks.enabled }))
vi.mock('./aily-client', () => ({
  AilyClient: class {
    constructor(directory: string) {
      mocks.construct(directory)
    }
    status = mocks.status
    connect = mocks.connect
    disconnect = mocks.disconnect
    discover = mocks.discover
    messages = mocks.messages
    send = mocks.send
  }
}))
import { companionDirectory } from '../../shared/forflow-companion-paths'
import { registerForflowAilyHandlers } from './aily-ipc'

const frame = {}
const event = { senderFrame: frame, sender: { mainFrame: frame } }
function invoke(operation: string, sender = event, value?: unknown): unknown {
  const handler = mocks.handle.mock.calls.find(
    ([channel]) => channel === `forflow:aily:${operation}`
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
  registerForflowAilyHandlers()
})
describe('desktop aily IPC', () => {
  it.each(['status', 'connect', 'disconnect', 'discover', 'messages', 'send'])(
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
        mocks.discover,
        mocks.messages,
        mocks.send
      ]) {
        expect(method).not.toHaveBeenCalled()
      }
    }
  )
  it('rejects invalid recipients and outbound payloads', () => {
    expect(() => invoke('connect', event, 'someone@example.com')).toThrow()
    expect(() => invoke('send', event, { text: '任务', chatId: 'oc_other' })).toThrow()
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('routes only the validated recipient and message', () => {
    const input = { text: '任务', requestId: 'ced7b8b1-c99b-4f69-bffa-c00c086c1d66' }
    invoke('connect', event, 'oc_personal')
    invoke('send', event, input)
    expect(mocks.construct).toHaveBeenCalledWith(companionDirectory('aily'))
    expect(mocks.mkdir).toHaveBeenCalledWith(companionDirectory('aily'), {
      recursive: true,
      mode: 0o700
    })
    expect(mocks.connect).toHaveBeenCalledWith('oc_personal')
    expect(mocks.send).toHaveBeenCalledWith(input)
  })
})
