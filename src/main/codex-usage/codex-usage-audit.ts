import { open } from 'node:fs/promises'
import type { CodexUsageRange, CodexUsageScope } from '../../shared/codex-usage-types'
import type { CodexUsageAudit } from '../../shared/codex-usage-audit-types'
import type { UsageWorktreeResolver } from '../usage/usage-worktree-resolver'
import { getUsageRangeCutoff } from '../usage/usage-calendar-range'
import type { CodexUsagePersistedState } from './types'
import { getFilteredSessions } from './codex-usage-scope-filters'
import {
  collectCodexAuditLine,
  finishCodexAudit,
  type AuditAccumulator
} from './codex-audit-records'

const MAX_FILES = 8
const MAX_FILE_BYTES = 2 * 1024 * 1024

export async function readCodexUsageAudit(
  state: CodexUsagePersistedState,
  scope: CodexUsageScope,
  range: CodexUsageRange,
  resolveWorktree: UsageWorktreeResolver
): Promise<CodexUsageAudit> {
  const audit: CodexUsageAudit = {
    scope,
    range,
    status: state.scanState.enabled ? 'ready' : 'disabled',
    updatedAt: Date.now(),
    filesRead: 0,
    candidateFiles: 0,
    truncatedFiles: 0,
    failedFiles: 0,
    malformedLines: 0,
    skippedUnknownScope: 0,
    counts: { context: 0, request: 0, tool: 0, data: 0 },
    toolResults: 0,
    rows: []
  }
  if (!state.scanState.enabled) {
    return audit
  }
  const selected = new Set(
    getFilteredSessions(state, scope, range).map((session) => session.sessionId)
  )
  const files = state.processedFiles
    .filter((file) => file.sessions.some((session) => selected.has(session.sessionId)))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
  audit.candidateFiles = files.length
  const accumulator: AuditAccumulator = {
    audit,
    cutoff: getUsageRangeCutoff(range),
    resolveWorktree,
    seen: new Set(),
    calls: new Map(),
    results: new Set()
  }
  for (const file of files.slice(0, MAX_FILES)) {
    try {
      const handle = await open(file.path, 'r')
      try {
        const stat = await handle.stat()
        if (!stat.isFile()) {
          audit.failedFiles++
          continue
        }
        const start = Math.max(0, stat.size - MAX_FILE_BYTES)
        const buffer = Buffer.alloc(Math.min(stat.size, MAX_FILE_BYTES))
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, start)
        audit.filesRead++
        if (start > 0) {
          audit.truncatedFiles++
        }
        let offset = start > 0 ? buffer.indexOf(10) + 1 : 0
        if (start > 0 && offset === 0) {
          continue
        }
        const cursor = { sessionId: null, cwd: null }
        while (offset < bytesRead) {
          const end = buffer.indexOf(10, offset)
          if (end === -1 || end >= bytesRead) {
            break
          }
          collectCodexAuditLine(
            buffer.toString('utf8', offset, end),
            file.path,
            start + offset,
            cursor,
            accumulator
          )
          offset = end + 1
        }
      } finally {
        await handle.close()
      }
    } catch {
      audit.failedFiles++
    }
  }
  finishCodexAudit(accumulator)
  return audit
}
