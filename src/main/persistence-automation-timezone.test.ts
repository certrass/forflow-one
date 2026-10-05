import type { AutomationCreateInput } from '../shared/automations-types'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { testState, createStore, readDataFile, makeRepo } from './persistence-test-harness'

// Stub the ~/.ssh/config parser so the SSH-import test drives the real Store with deterministic hosts, not the operator's actual ~/.ssh/config.
const { loadUserSshConfigMock, sshConfigHostsToTargetsMock } = vi.hoisted(() => ({
  loadUserSshConfigMock: vi.fn(),
  sshConfigHostsToTargetsMock: vi.fn()
}))

vi.mock('./ssh/ssh-config-parser', () => ({
  loadUserSshConfig: loadUserSshConfigMock,
  sshConfigHostsToTargets: sshConfigHostsToTargetsMock
}))
const { trackMock, getCohortAtEmitMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  getCohortAtEmitMock: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    getPath: () => testState.dir
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (plaintext: string) => Buffer.from(`encrypted:${plaintext}`, 'utf-8'),
    decryptString: (ciphertext: Buffer) => {
      const decoded = ciphertext.toString('utf-8')
      if (!decoded.startsWith('encrypted:')) {
        throw new Error('invalid ciphertext')
      }
      return decoded.slice('encrypted:'.length)
    }
  }
}))

vi.mock('./telemetry/client', () => ({
  track: trackMock
}))

vi.mock('./telemetry/cohort-classifier', () => ({
  getCohortAtEmit: getCohortAtEmitMock
}))

describe('persisted automation timezone', () => {
  beforeEach(() => {
    testState.dir = mkdtempSync(join(tmpdir(), 'forflow-schedule-test-'))
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-19T00:00:00Z'))
    vi.stubEnv('TZ', 'Asia/Shanghai')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    rmSync(testState.dir, { recursive: true, force: true })
  })

  it('creates, updates timezone only, advances, and persists without changing its definition', () => {
    const store = createStore()
    store.addRepo(makeRepo())
    const definition: AutomationCreateInput = {
      name: 'Disabled timezone fixture',
      prompt: 'Do not execute',
      agentId: 'codex',
      projectId: 'r1',
      workspaceMode: 'new_per_run' as const,
      enabled: false,
      timezone: 'UTC',
      rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0',
      dtstart: Date.parse('2026-09-01T00:00:00Z')
    }
    const created = store.createAutomation(definition)
    expect(created.nextRunAt).toBe(Date.parse('2026-09-19T09:00:00Z'))
    const updated = store.updateAutomation(created.id, { timezone: 'Asia/Shanghai' })
    expect(updated.nextRunAt).toBe(Date.parse('2026-09-19T01:00:00Z'))
    expect(updated).toMatchObject({ ...definition, timezone: 'Asia/Shanghai' })
    expect(store.getLatestAutomationOccurrence(updated, Date.parse('2026-09-19T02:00:00Z'))).toBe(
      Date.parse('2026-09-19T01:00:00Z')
    )
    const advanced = store.advanceAutomationNextRun(created.id, Date.parse('2026-09-19T01:00:00Z'))
    expect(advanced.nextRunAt).toBe(Date.parse('2026-09-20T01:00:00Z'))
    store.flush()
    expect(readDataFile()).toMatchObject({
      automations: [
        expect.objectContaining({
          ...definition,
          timezone: 'Asia/Shanghai',
          nextRunAt: advanced.nextRunAt
        })
      ]
    })
    const reopened = createStore()
    expect(reopened.listAutomations()).toContainEqual(
      expect.objectContaining({
        id: created.id,
        timezone: 'Asia/Shanghai',
        rrule: definition.rrule,
        enabled: false
      })
    )
  })

  it('refuses an invalid timezone without replacing the saved automation', () => {
    const store = createStore()
    store.addRepo(makeRepo())
    const created = store.createAutomation({
      name: 'Disabled',
      prompt: 'Do not execute',
      agentId: 'codex',
      projectId: 'r1',
      workspaceMode: 'new_per_run',
      timezone: 'UTC',
      enabled: false,
      rrule: '0 9 * * *',
      dtstart: Date.parse('2026-09-01T00:00:00Z')
    })
    expect(() => store.updateAutomation(created.id, { timezone: 'Invalid/Zone' })).toThrow(
      RangeError
    )
    expect(store.listAutomations()).toContainEqual(created)
  })
})
