import { afterEach, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseAgentStatusPayload } from '../../shared/agent-status-types'
import { CompanionJournal } from './companion-journal'

const roots: string[] = []
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

it('publishes permission requests in the status vocabulary accepted by native chat', () => {
  const root = mkdtempSync(join(tmpdir(), 'companion-status-'))
  roots.push(root)
  vi.stubEnv('HOME', root)
  vi.stubEnv('USERPROFILE', root)
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  const journal = new CompanionJournal('workbuddy', 'permission-test')
  const prompt = JSON.stringify({ questions: [{ question: 'Write file?', options: [] }] })
  journal.status('waiting', prompt)
  const output = String(stdout.mock.calls[0]?.[0])
  const parsed = parseAgentStatusPayload(output.slice('\x1b]9999;'.length, -1))
  expect(parsed).toMatchObject({
    state: 'waiting',
    agentType: 'workbuddy',
    interactivePrompt: prompt,
    providerSession: { id: 'permission-test', transcriptPath: journal.path }
  })
})

it('retains imported message order when several records arrive within one millisecond', () => {
  const root = mkdtempSync(join(tmpdir(), 'companion-order-'))
  roots.push(root)
  vi.stubEnv('HOME', root)
  vi.stubEnv('USERPROFILE', root)
  vi.spyOn(Date, 'now').mockReturnValue(1000)
  const journal = new CompanionJournal('aily', 'order-test')
  journal.message('user', 'Question', 'z-question')
  journal.message('assistant', 'Answer', 'a-answer')
  journal.turn('completed', 'turn-1')
  const records = readFileSync(journal.path, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  expect(records.map((record) => record.timestamp)).toEqual([1000, 1001, 1002])
})
