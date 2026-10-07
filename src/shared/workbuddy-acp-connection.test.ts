import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ spawn: vi.fn(), terminate: vi.fn() }))
vi.mock('./child-process/run-process', () => ({ spawnProcess: mocks.spawn }))
vi.mock('./child-process/process-tree-termination', () => ({
  forceTerminateProcessTree: mocks.terminate
}))
import { WorkBuddyConnection } from './workbuddy-acp-connection'

let child: EventEmitter & { stdin: PassThrough; stdout: PassThrough; stderr: PassThrough }
beforeEach(() => {
  vi.resetAllMocks()
  child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough()
  })
  mocks.spawn.mockReturnValue(child)
  mocks.terminate.mockImplementation(async () => {
    child.emit('close')
  })
})
afterEach(() => {
  vi.useRealTimers()
})
it('preserves the chat arguments and passes account-only isolation options', async () => {
  const chat = new WorkBuddyConnection('/workbuddy', '/project', () => {})
  expect(mocks.spawn.mock.calls[0][0].args).toEqual(['--acp', '--permission-mode', 'default'])
  await chat.close()
  const account = new WorkBuddyConnection('/workbuddy', '/private-probe', () => {}, {
    args: ['--tools', ''],
    env: { CODEBUDDY_CONFIG_DIR: '/private-config' }
  })
  expect(mocks.spawn.mock.calls[1][0]).toMatchObject({
    args: ['--acp', '--permission-mode', 'default', '--tools', ''],
    env: { CODEBUDDY_CONFIG_DIR: '/private-config', DISABLE_AUTOUPDATER: '1' }
  })
  await account.close()
})
it('correlates NDJSON replies and rejects pending requests on process exit', async () => {
  const connection = new WorkBuddyConnection('/workbuddy', '/tmp', () => {})
  const response = connection.request('initialize', {})
  child.stdout.write('{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":1}}\n')
  expect(await response).toEqual({ protocolVersion: 1 })
  const pending = connection.request('_codebuddy.ai/getUserInfo', {})
  const rejected = expect(pending).rejects.toThrow('已退出')
  child.emit('close')
  await rejected
  await expect(connection.request('initialize', {})).rejects.toThrow('已退出')
})
it('bounds account requests and terminates the owned process on close', async () => {
  vi.useFakeTimers()
  const connection = new WorkBuddyConnection('/workbuddy', '/tmp', () => {})
  const rejected = expect(connection.request('initialize', {}, 15_000)).rejects.toThrow('超时')
  await vi.advanceTimersByTimeAsync(15_000)
  await rejected
  await connection.close()
  expect(mocks.terminate).toHaveBeenCalledExactlyOnceWith(child)
})
