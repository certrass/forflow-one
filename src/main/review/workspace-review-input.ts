import type { WorkspaceReviewQuery } from '../../shared/workspace-review-types'
import type { CodexUsageAudit } from '../../shared/codex-usage-audit-types'
import { codexEvidenceKey } from '../../shared/codex-review-types'
import type { CodexUsageStore } from '../codex-usage/store'
import type { CodexReviewSource } from '../codex-usage/codex-review-version'
import type { WorkspaceReviewSource } from './workspace-review-source'

export async function readWorkspaceReviewInput(
  query: WorkspaceReviewQuery,
  workspaceSource: WorkspaceReviewSource,
  usage: Pick<CodexUsageStore, 'getReviewSource'>
): Promise<CodexReviewSource> {
  const workspace = await workspaceSource.capture(query)
  workspace.gaps = workspace.gaps.filter(
    (gap) => gap !== '关联会话仅记录明确选择的 ID，本文件快照尚未纳入会话正文'
  )
  const audit: CodexUsageAudit = {
    scope: 'all',
    range: 'all',
    status: 'ready',
    updatedAt: Date.now(),
    filesRead: 0,
    candidateFiles: 0,
    truncatedFiles: 0,
    failedFiles: 0,
    malformedLines: 0,
    skippedUnknownScope: 0,
    toolResults: 0,
    counts: { context: 0, request: 0, tool: 0, data: 0 },
    rows: [],
    conflictingRecords: 0,
    messageCounts: { user: 0, assistant: 0 },
    omittedRows: 0,
    incompleteLines: 0,
    unreadSources: [],
    sources: []
  }
  const rows = new Map<string, CodexUsageAudit['rows'][number]>()
  const sources = new Map<string, NonNullable<CodexUsageAudit['sources']>[number]>()
  for (const sessionId of [...new Set(query.selection.sessionIds)].sort()) {
    try {
      const source = await usage.getReviewSource({
        sessionId,
        scope: 'all',
        range: 'all',
        focus: query.focus
      })
      const linked = source.audit
      for (const field of [
        'candidateFiles',
        'truncatedFiles',
        'failedFiles',
        'malformedLines',
        'skippedUnknownScope',
        'toolResults'
      ] as const) {
        audit[field] += linked[field]
      }
      audit.omittedRows! += linked.omittedRows ?? 0
      audit.incompleteLines! += linked.incompleteLines ?? 0
      audit.conflictingRecords! += linked.conflictingRecords ?? 0
      audit.unreadSources!.push(...(linked.unreadSources ?? []))
      if (linked.status !== 'ready' || !linked.filesRead) {
        audit.failedFiles++
        workspace.gaps.push(`关联会话 ${sessionId} 没有可读取的日志。`)
      }
      if (linked.messageCounts === undefined || linked.omittedRows === undefined) {
        workspace.gaps.push(`关联会话 ${sessionId} 的正文覆盖范围未知。`)
      }
      for (const row of linked.rows) {
        const key = codexEvidenceKey(row)
        const previous = rows.get(key)
        if (previous && previous.contentHash !== row.contentHash) {
          audit.conflictingRecords!++
        }
        rows.set(key, row)
      }
      for (const file of linked.sources ?? []) {
        const key = JSON.stringify([file.path, file.start, file.end])
        if (sources.has(key) && sources.get(key)?.sha256 !== file.sha256) {
          audit.conflictingRecords!++
        }
        sources.set(key, file)
      }
    } catch {
      audit.failedFiles++
      workspace.gaps.push(
        `关联会话 ${sessionId} 读取失败或已不在当前索引中，请检查本机读取设置与来源。`
      )
    }
  }
  const allRows = [...rows.values()].sort(
    (a, b) =>
      a.timestamp.localeCompare(b.timestamp) ||
      codexEvidenceKey(a).localeCompare(codexEvidenceKey(b))
  )
  audit.omittedRows! += Math.max(0, allRows.length - 200)
  audit.rows = allRows.slice(-200)
  audit.sources = [...sources.values()].sort(
    (a, b) => a.path.localeCompare(b.path) || a.start - b.start
  )
  audit.filesRead = new Set(audit.sources.map((file) => file.path)).size
  for (const row of allRows) {
    audit.counts[row.kind]++
    if (row.messageRole) {
      audit.messageCounts![row.messageRole]++
    }
  }
  return { usage: null, audit, workspace }
}
