import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  renderer: vi.fn()
}))
vi.mock('electron', () => ({
  ipcMain: {
    handle: (name: string, fn: (...args: unknown[]) => unknown) => mocks.handlers.set(name, fn)
  }
}))
vi.mock('../ipc/ui', () => ({
  getTrustedUIRendererWebContents: mocks.renderer,
  isTrustedUIRenderer: (sender: unknown) => sender === mocks.renderer()
}))
import {
  requestForflowApproval,
  registerForflowApprovalHandlers,
  FORFLOW_APPROVAL_TIMEOUT_MS
} from './approval-broker'

class Renderer extends EventEmitter {
  id = 4
  mainFrame = {}
  send = vi.fn()
  isDestroyed = () => false
}
let renderer: Renderer
function invoke(name: string, ...args: unknown[]): unknown {
  return mocks.handlers.get(`forflow:approval:${name}`)!(
    { sender: renderer, senderFrame: renderer.mainFrame },
    ...args
  )
}
const details = {
  kind: 'upload' as const,
  destination: 'SSH: test.invalid',
  description: 'fixture.txt'
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'cn-private')
  renderer = new Renderer()
  mocks.renderer.mockReturnValue(renderer)
  registerForflowApprovalHandlers()
})
afterEach(() => {
  renderer.emit('destroyed')
  vi.useRealTimers()
  vi.unstubAllEnvs()
})
function firstId(): string {
  const requests = invoke('pending')
  if (!Array.isArray(requests) || typeof requests[0]?.id !== 'string') {
    throw new Error('No request')
  }
  return requests[0].id
}
describe('Forflow one-operation decisions', () => {
  it('requires an explicit decision, consumes it once and publishes no content', async () => {
    const promise = requestForflowApproval(details)
    const id = firstId()
    expect(invoke('pending')).toEqual([expect.objectContaining(details)])
    expect(invoke('decide', id, true)).toBe(true)
    await expect(promise).resolves.toBe(true)
    expect(invoke('decide', id, true)).toBe(false)
    expect(invoke('pending')).toEqual([])
  })
  it('cancels without a decision at the deadline', async () => {
    const promise = requestForflowApproval(details)
    const id = firstId()
    await vi.advanceTimersByTimeAsync(FORFLOW_APPROVAL_TIMEOUT_MS)
    await expect(promise).resolves.toBe(false)
    expect(invoke('decide', id, true)).toBe(false)
  })
  it('cancels when the originating page aborts', async () => {
    const controller = new AbortController()
    const promise = requestForflowApproval(details, controller.signal)
    controller.abort()
    await expect(promise).resolves.toBe(false)
    expect(invoke('pending')).toEqual([])
  })
  it.each(['destroyed', 'render-process-gone'])('cancels on renderer %s', async (event) => {
    const promise = requestForflowApproval(details)
    renderer.emit(event)
    await expect(promise).resolves.toBe(false)
  })
  it('refuses decisions from other windows and nested frames', async () => {
    const promise = requestForflowApproval(details)
    const id = firstId()
    const decide = mocks.handlers.get('forflow:approval:decide')!
    expect(() =>
      decide({ sender: new Renderer(), senderFrame: renderer.mainFrame }, id, true)
    ).toThrow('主界面')
    expect(() => decide({ sender: renderer, senderFrame: {} }, id, true)).toThrow('主界面')
    invoke('decide', id, false)
    await expect(promise).resolves.toBe(false)
  })
  it('rejects non-boolean decisions without consuming the request', async () => {
    const promise = requestForflowApproval(details)
    const id = firstId()
    expect(() => invoke('decide', id, 'true')).toThrow()
    invoke('decide', id, false)
    await expect(promise).resolves.toBe(false)
  })
  it('does not permit unattended or unbounded prompts', async () => {
    const promises = Array.from({ length: 8 }, () => requestForflowApproval(details))
    await expect(requestForflowApproval(details)).resolves.toBe(false)
    renderer.emit('destroyed')
    expect(await Promise.all(promises)).toEqual(Array(8).fill(false))
    mocks.renderer.mockReturnValue(null)
    await expect(requestForflowApproval(details)).resolves.toBe(false)
  })
  it('keeps the upstream profile behavior separate', async () => {
    vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'upstream')
    await expect(requestForflowApproval(details)).resolves.toBe(true)
    expect(invoke('pending')).toEqual([])
  })
})
