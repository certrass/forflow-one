import type { CodexUsageRange, CodexUsageScope } from './codex-usage-types'

export type CodexAuditKind = 'context' | 'request' | 'tool' | 'data'
export type CodexAuditRow = {
  kind: CodexAuditKind
  timestamp: string
  sourcePath: string
  byteOffset: number
  sessionId: string | null
  name: string
  recordId: string | null
  tokens: number | null
  hasResult: boolean | null
}
export type CodexUsageAudit = {
  scope: CodexUsageScope
  range: CodexUsageRange
  status: 'ready' | 'disabled'
  updatedAt: number
  filesRead: number
  candidateFiles: number
  truncatedFiles: number
  failedFiles: number
  malformedLines: number
  skippedUnknownScope: number
  counts: Record<CodexAuditKind, number>
  toolResults: number
  rows: CodexAuditRow[]
}
