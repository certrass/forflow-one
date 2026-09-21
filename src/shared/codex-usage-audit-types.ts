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
  evidenceKey?: string
  contentHash?: string
  messageRole?: 'user' | 'assistant'
  recordFormat?: 'response_message' | 'turn_context' | 'compaction'
  messageTextChars?: number
  unsupportedContentBlocks?: number
  resultSource?: { sourcePath: string; byteOffset: number; contentHash: string }
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
  conflictingRecords?: number
  messageCounts?: { user: number; assistant: number }
  omittedRows?: number
  incompleteLines?: number
  unreadSources?: { path: string; reason: 'file_limit' | 'read_failed' }[]
  sources?: {
    path: string
    start: number
    end: number
    size: number
    sha256: string
    mtimeMs?: number
  }[]
}
