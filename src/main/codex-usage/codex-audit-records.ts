import { createHash } from 'node:crypto'
import type { CodexAuditRow, CodexUsageAudit } from '../../shared/codex-usage-audit-types'
import { getLocalUsageDay } from '../usage/usage-calendar-range'
import type { UsageWorktreeResolver } from '../usage/usage-worktree-resolver'

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 256 ? value : null
}

export type AuditCursor = { sessionId: string | null; cwd: string | null }
export type AuditAccumulator = {
  audit: CodexUsageAudit
  cutoff: string | null
  resolveWorktree: UsageWorktreeResolver
  seen: Set<string>
  calls: Map<string, CodexAuditRow>
  results: Set<string>
}

export function collectCodexAuditLine(
  line: string,
  sourcePath: string,
  byteOffset: number,
  cursor: AuditCursor,
  accumulator: AuditAccumulator
): void {
  const { audit, cutoff, seen, calls, results } = accumulator
  let row: unknown
  try {
    row = JSON.parse(line)
  } catch {
    audit.malformedLines++
    return
  }
  if (!record(row) || !record(row.payload)) {
    return
  }
  const payload = row.payload
  if (row.type === 'session_meta') {
    cursor.sessionId = text(payload.id)
    cursor.cwd = typeof payload.cwd === 'string' ? payload.cwd : null
    return
  }
  if (row.type === 'turn_context') {
    cursor.cwd = typeof payload.cwd === 'string' ? payload.cwd : cursor.cwd
  }
  const timestamp = text(row.timestamp)
  const day = timestamp ? getLocalUsageDay(timestamp) : null
  if (!timestamp || !day || (cutoff && day < cutoff)) {
    return
  }
  if (audit.scope === 'orca') {
    if (!cursor.cwd) {
      audit.skippedUnknownScope++
      return
    }
    if (!accumulator.resolveWorktree(cursor.cwd)) {
      return
    }
  }
  const identity = createHash('sha256').update(line).digest('hex')
  const callId = text(payload.call_id)
  if (
    row.type === 'response_item' &&
    (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output')
  ) {
    if (callId) {
      results.add(callId)
    }
    return
  }
  let kind: CodexAuditRow['kind']
  let name: string
  let recordId: string | null = null
  let tokens: number | null = null
  let key = identity
  if (
    row.type === 'turn_context' ||
    row.type === 'compacted' ||
    (row.type === 'event_msg' && payload.type === 'context_compacted')
  ) {
    kind = 'context'
    name =
      row.type === 'turn_context'
        ? `回合上下文 · ${text(payload.model) ?? '模型未记录'}`
        : '上下文压缩记录'
    recordId = text(payload.turn_id)
  } else if (row.type === 'token_usage_record' && text(payload.response_id)) {
    kind = 'request'
    name = '模型响应用量'
    recordId = text(payload.response_id)
    key = `request:${recordId}`
    tokens =
      record(payload.usage) &&
      typeof payload.usage.total_tokens === 'number' &&
      Number.isSafeInteger(payload.usage.total_tokens) &&
      payload.usage.total_tokens >= 0
        ? payload.usage.total_tokens
        : null
  } else if (
    row.type === 'response_item' &&
    (payload.type === 'function_call' || payload.type === 'custom_tool_call') &&
    callId
  ) {
    kind = 'tool'
    name = text(payload.name) ?? '未命名工具'
    recordId = callId
    key = `tool:${callId}`
  } else {
    return
  }
  if (seen.has(key)) {
    return
  }
  seen.add(key)
  const entry: CodexAuditRow = {
    kind,
    name,
    recordId,
    timestamp,
    sourcePath,
    byteOffset,
    sessionId: text(payload.session_id) ?? cursor.sessionId,
    tokens,
    hasResult: kind === 'tool' ? false : null
  }
  audit.counts[kind]++
  audit.rows.push(entry)
  if (kind === 'tool' && callId) {
    calls.set(callId, entry)
  }
}

export function finishCodexAudit(accumulator: AuditAccumulator): void {
  for (const [callId, row] of accumulator.calls) {
    row.hasResult = accumulator.results.has(callId)
    if (row.hasResult) {
      accumulator.audit.toolResults++
    }
  }
  // Keep metadata only; command arguments and result bodies never enter the audit snapshot.
  const counts = { context: 0, request: 0, tool: 0, data: 0 }
  accumulator.audit.rows = accumulator.audit.rows
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .filter((row) => ++counts[row.kind] <= 12)
}
