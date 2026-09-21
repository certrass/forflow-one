import { open } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import type { CodexUsageRange, CodexUsageScope } from '../../shared/codex-usage-types'
import type { CodexUsageAudit } from '../../shared/codex-usage-audit-types'
import type { UsageWorktreeResolver } from '../usage/usage-worktree-resolver'
import { getUsageRangeCutoff } from '../usage/usage-calendar-range'
import type { CodexUsagePersistedState } from './types'
import { getFilteredSessions } from './codex-usage-scope-filters'
import {
  collectCodexAuditLine,
  finishCodexAudit,
  type AuditCursor,
  type AuditAccumulator
} from './codex-audit-records'

const MAX_FILES = 8
const MAX_FILE_BYTES = 2 * 1024 * 1024

export async function readCodexUsageAudit(
  state: CodexUsagePersistedState,
  scope: CodexUsageScope,
  range: CodexUsageRange,
  resolveWorktree: UsageWorktreeResolver,
  options: { sessionId?: string; rowLimit?: number } = {}
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
    rows: [],
    sources: [],
    conflictingRecords: 0,
    messageCounts: { user: 0, assistant: 0 },
    omittedRows: 0,
    incompleteLines: 0,
    unreadSources: []
  }
  if (!state.scanState.enabled) {
    return audit
  }
  const selected = new Set(
    getFilteredSessions(state, scope, range)
      .filter((session) => !options.sessionId || session.sessionId === options.sessionId)
      .map((session) => session.sessionId)
  )
  const files = state.processedFiles
    .filter((file) => file.sessions.some((session) => selected.has(session.sessionId)))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
  audit.candidateFiles = files.length
  audit.unreadSources = files
    .slice(MAX_FILES)
    .map((file) => ({ path: file.path, reason: 'file_limit' }))
  const accumulator: AuditAccumulator = {
    audit,
    cutoff: getUsageRangeCutoff(range),
    resolveWorktree,
    seen: new Set(),
    calls: new Map(),
    results: new Set(),
    resultSources: new Map(),
    identities: new Map(),
    sessionId: options.sessionId,
    rowLimit: options.rowLimit
  }
  for (const file of files.slice(0, MAX_FILES)) {
    try {
      const handle = await open(file.path, 'r')
      try {
        const stat = await handle.stat()
        if (!stat.isFile()) {
          audit.failedFiles++
          audit.unreadSources.push({ path: file.path, reason: 'read_failed' })
          continue
        }
        const start = Math.max(0, stat.size - MAX_FILE_BYTES)
        const buffer = Buffer.alloc(Math.min(stat.size, MAX_FILE_BYTES))
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, start)
        audit.sources?.push({
          path: file.path,
          start,
          end: start + bytesRead,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          sha256: createHash('sha256').update(buffer.subarray(0, bytesRead)).digest('hex')
        })
        audit.filesRead++
        if (start > 0) {
          audit.truncatedFiles++
        }
        let offset = 0
        if (start > 0) {
          const preceding = Buffer.alloc(1)
          await handle.read(preceding, 0, 1, start - 1)
          if (preceding[0] !== 10) {
            audit.incompleteLines = (audit.incompleteLines ?? 0) + 1
            offset = buffer.indexOf(10) + 1
            if (offset === 0) {
              continue
            }
          }
        }
        const cursor: AuditCursor = {
          sessionId: file.sessions.length === 1 ? file.sessions[0].sessionId : null,
          cwd: null
        }
        if (start > 0) {
          const header = Buffer.alloc(Math.min(stat.size, 65536))
          const read = await handle.read(header, 0, header.length, 0)
          cursor.sessionId = null
          try {
            const metadata: unknown = JSON.parse(
              header.toString('utf8', 0, Math.min(read.bytesRead, header.indexOf(10)))
            )
            if (
              metadata &&
              typeof metadata === 'object' &&
              'type' in metadata &&
              metadata.type === 'session_meta' &&
              'payload' in metadata
            ) {
              const payload = metadata.payload
              if (
                payload &&
                typeof payload === 'object' &&
                'id' in payload &&
                typeof payload.id === 'string'
              ) {
                cursor.sessionId = payload.id
              }
            }
          } catch {
            /* A partial header cannot establish session identity. */
          }
        }
        while (offset < bytesRead) {
          const end = buffer.indexOf(10, offset)
          if (end === -1 || end >= bytesRead) {
            audit.incompleteLines = (audit.incompleteLines ?? 0) + 1
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
      audit.unreadSources.push({ path: file.path, reason: 'read_failed' })
    }
  }
  finishCodexAudit(accumulator)
  return audit
}
