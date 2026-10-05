import type { CodexReview } from '../../../../shared/codex-review-types'
import type { JevReceipt } from '../../../../shared/jev-audit-types'
import {
  canRecordJevAnswer,
  hasCurrentJevEvaluator
} from '../../../../shared/jev-delivery-assessment'

export type ReviewActivity = {
  id: string
  kind: 'version' | 'issue' | 'comment' | 'confirmation' | 'check'
  timestamp: number
  versionId: string
  text: string
  evidenceKey?: string
  check?: JevReceipt
}

export function buildReviewActivity(review: CodexReview, receipts: JevReceipt[]): ReviewActivity[] {
  const events: ReviewActivity[] = [
    ...review.versions.map((version) => ({
      id: `version:${version.id}`,
      kind: 'version' as const,
      timestamp: version.createdAt,
      versionId: version.id,
      text: version.focus
    })),
    ...review.issues.map((issue) => ({
      id: `issue:${issue.id}`,
      kind: 'issue' as const,
      timestamp: issue.createdAt,
      versionId: issue.versionId,
      text: issue.title,
      ...(issue.evidenceKey ? { evidenceKey: issue.evidenceKey } : {})
    })),
    ...review.comments.map((comment) => ({
      id: `comment:${comment.id}`,
      kind: 'comment' as const,
      timestamp: comment.createdAt,
      versionId: comment.versionId,
      text: comment.text
    })),
    ...review.confirmations.map((confirmation) => ({
      id: `confirmation:${confirmation.versionId}:${confirmation.revision}`,
      kind: 'confirmation' as const,
      timestamp: confirmation.createdAt,
      versionId: confirmation.versionId,
      text: ''
    })),
    ...receipts
      .filter((receipt) => receipt.reviewId === review.id)
      .map((receipt) => ({
        id: `check:${receipt.id}`,
        kind: 'check' as const,
        timestamp: receipt.completedAt ?? receipt.createdAt,
        versionId: receipt.versionId,
        text: receipt.requestedModel,
        evidenceKey: receipt.evidenceKey,
        check: receipt
      }))
  ]
  return events.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
}

export function summarizeReviewChecks(receipts: JevReceipt[], versionId: string) {
  const checks = receipts.filter(
    (receipt) => receipt.versionId === versionId && hasCurrentJevEvaluator(receipt)
  )
  return {
    total: checks.length,
    completed: checks.filter((receipt) => receipt.status === 'completed').length,
    incomplete: checks.filter((receipt) => receipt.status !== 'completed').length,
    attention: checks.reduce(
      (sum, receipt) =>
        sum +
        Object.entries(receipt.result?.answers ?? {}).filter(([question, answer]) =>
          canRecordJevAnswer(question, answer)
        ).length,
      0
    )
  }
}
