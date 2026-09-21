import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CodexUsageStore } from '../codex-usage/store'
import { CodexReviewStore } from '../codex-usage/codex-review-store'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  trusted: true,
  enabled: true,
  created: vi.fn(),
  prepare: vi.fn(),
  run: vi.fn(),
  list: vi.fn(),
  accept: vi.fn()
}))
vi.mock('electron', () => ({
  app: { getPath: () => '/unused-fixture' },
  ipcMain: { handle: mocks.handle }
}))
vi.mock('./ui', () => ({ isTrustedUIRenderer: () => mocks.trusted }))
vi.mock('../forflow/deployment-policy', () => ({ isForflowPrivateDeployment: () => mocks.enabled }))
vi.mock('../forflow/model-account-storage', () => ({ ForflowModelAccountStorage: class {} }))
vi.mock('../forflow/jev-audit-ledger', () => ({ JevAuditLedger: class {} }))
vi.mock('../forflow/jev-audit-service', () => ({
  JevAuditService: class {
    constructor() {
      mocks.created()
    }
    prepare = mocks.prepare
    run = mocks.run
    list = mocks.list
    accept = mocks.accept
  }
}))
import { registerJevAuditHandlers } from './jev-audit-handlers'

const frame = {}
const event = { senderFrame: frame, sender: { mainFrame: frame } }
function invoke(operation: string, value?: unknown, sender = event) {
  const handler = mocks.handle.mock.calls.find(
    ([channel]) => channel === `forflow:jev:${operation}`
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
  registerJevAuditHandlers(new CodexReviewStore('/unused-fixture/reviews', vi.fn()), {
    getScanState: vi.fn<CodexUsageStore['getScanState']>()
  })
})

describe('Jev desktop IPC boundary', () => {
  it.each(['prepare', 'run', 'list', 'accept'])(
    'rejects %s from untrusted windows, subframes or other builds',
    (operation) => {
      mocks.trusted = false
      expect(() => invoke(operation)).toThrow('桌面主界面')
      mocks.trusted = true
      mocks.enabled = false
      expect(() => invoke(operation)).toThrow('桌面主界面')
      mocks.enabled = true
      expect(() => invoke(operation, undefined, { ...event, senderFrame: {} })).toThrow(
        '桌面主界面'
      )
      expect(mocks.created).not.toHaveBeenCalled()
    }
  )
  it('rejects arbitrary payloads and external destinations before they reach the service', () => {
    expect(() =>
      invoke('prepare', { reviewId: 'bad', endpoint: 'https://invalid.example' })
    ).toThrow()
    expect(() => invoke('run', { id: 'bad', body: 'unreviewed content' })).toThrow()
    expect(mocks.prepare).not.toHaveBeenCalled()
    expect(mocks.run).not.toHaveBeenCalled()
    invoke('list', 'a'.repeat(64))
    expect(mocks.list).toHaveBeenCalledWith('a'.repeat(64))
  })
})
