import type { CodexUsageAudit } from './codex-usage-audit-types'

export function isCodexAuditPartial(audit: CodexUsageAudit): boolean {
  return (
    audit.status !== 'ready' ||
    audit.filesRead === 0 ||
    audit.filesRead < audit.candidateFiles ||
    audit.truncatedFiles > 0 ||
    audit.failedFiles > 0 ||
    audit.malformedLines > 0 ||
    audit.skippedUnknownScope > 0 ||
    audit.conflictingRecords !== 0 ||
    audit.omittedRows !== 0 ||
    audit.incompleteLines !== 0 ||
    audit.unreadSources === undefined ||
    audit.unreadSources.length > 0 ||
    audit.messageCounts === undefined ||
    audit.sources === undefined ||
    audit.rows.some((row) => (row.unsupportedContentBlocks ?? 0) > 0)
  )
}
