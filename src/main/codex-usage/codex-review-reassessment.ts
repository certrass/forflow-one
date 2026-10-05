import { randomUUID } from 'node:crypto'
import { codexReviewRowSignature } from '../../shared/codex-review-comparison'
import {
  codexEvidenceKey,
  type CodexReview,
  type CodexReviewVersion
} from '../../shared/codex-review-types'

function evidenceUnchanged(
  previous: CodexReviewVersion | undefined,
  current: CodexReviewVersion,
  key: string
): boolean {
  if (!previous) {
    return false
  }
  const before = previous.workspace?.files.find((file) => file.evidenceKey === key)
  const after = current.workspace?.files.find((file) => file.evidenceKey === key)
  if (before || after) {
    return Boolean(
      before &&
      after &&
      before.status === 'read' &&
      after.status === 'read' &&
      before.contentHash &&
      before.contentHash === after.contentHash &&
      before.path === after.path &&
      before.kind === after.kind &&
      previous.workspace?.rootIdentity === current.workspace?.rootIdentity &&
      previous.workspace?.target.id === current.workspace?.target.id &&
      previous.workspace?.target.hostId === current.workspace?.target.hostId
    )
  }
  const beforeRow = previous.audit.rows.find((row) => codexEvidenceKey(row) === key)
  const afterRow = current.audit.rows.find((row) => codexEvidenceKey(row) === key)
  return Boolean(
    beforeRow?.contentHash &&
    afterRow?.contentHash &&
    (!beforeRow.hasResult || beforeRow.resultSource?.contentHash) &&
    (!afterRow.hasResult || afterRow.resultSource?.contentHash) &&
    codexReviewRowSignature(beforeRow) === codexReviewRowSignature(afterRow)
  )
}

export function reassessCodexReviewIssues(
  review: CodexReview,
  version: CodexReviewVersion
): boolean {
  let changed = false
  for (const issue of review.issues) {
    const keys = [
      ...new Set([...(issue.evidenceKeys ?? []), ...(issue.evidenceKey ? [issue.evidenceKey] : [])])
    ]
    if (issue.status === 'open' || !keys.length || issue.resolvedInVersion === version.id) {
      continue
    }
    const basis = review.versions.find((entry) => entry.id === issue.resolvedInVersion)
    if (
      (!issue.evidenceKeys || basis?.focus === version.focus) &&
      keys.every((key) => evidenceUnchanged(basis, version, key))
    ) {
      continue
    }
    const basisNumber = review.versions.findIndex((entry) => entry.id === issue.resolvedInVersion)
    const priorDecision = basisNumber === -1 ? '历史版本' : `v${basisNumber + 1}`
    review.comments.push({
      id: randomUUID(),
      versionId: version.id,
      issueId: issue.id,
      text: `[open] ${priorDecision} 的处理依据已变化或无法核验，需重新复核；原处理决定保留在活动记录中。`,
      createdAt: Date.now()
    })
    issue.status = 'open'
    issue.resolution = null
    issue.resolvedInVersion = null
    changed = true
  }
  return changed
}
