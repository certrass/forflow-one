import type { JevReceipt } from '../../../../shared/jev-audit-types'
import type { CodexReview } from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { jevDeliveryCopy } from './jev-delivery-copy'
import { jevAuditCopy } from './jev-audit-copy'
import { JevNativeAnswer } from './JevNativeAnswer'
import { canRecordJevAnswer } from '../../../../shared/jev-delivery-assessment'
import { jevDeliveryResultCopy } from './jev-delivery-result-copy'
import { jevDeliveryResultSummary } from './jev-delivery-result-summary'

export function JevDeliveryResults({
  receipt,
  review,
  disabled,
  navigationDisabled = disabled,
  onAccept,
  onIssues,
  onRecheck
}: {
  receipt: JevReceipt
  review: CodexReview
  disabled: boolean
  navigationDisabled?: boolean
  onIssues?: () => void
  onRecheck?: () => void
  onAccept: (
    receiptId: string,
    question:
      | 'criterion_clarity'
      | 'criterion_evidence'
      | 'documented_current_nonconformance'
      | 'handoff_operability'
      | 'handoff_criterion_coverage'
  ) => void
}): React.JSX.Element {
  const c = jevDeliveryCopy()
  const legacy = jevAuditCopy()
  const guide = jevDeliveryResultCopy()
  const summaryKind = jevDeliveryResultSummary(receipt, review.versions.at(-1)?.id)
  const summary = guide.summaries[summaryKind]
  const canAdopt =
    summaryKind !== 'historical' &&
    summaryKind !== 'incomplete' &&
    summaryKind !== 'previousVersion'
  const hasRecordedIssue = review.issues.some((issue) =>
    issue.detail.includes(`[Jev:${receipt.id}:`)
  )
  const evidenceAnswer = receipt.result?.answers.criterion_evidence
  const evidenceActionable =
    evidenceAnswer && canRecordJevAnswer('criterion_evidence', evidenceAnswer)
  const evidenceAccepted = review.issues.some((issue) =>
    issue.detail.includes(`[Jev:${receipt.id}:criterion_evidence]`)
  )
  const questions = [
    ['criterion_evidence', c.evidence, c.actions.evidence],
    ['criterion_clarity', c.clarity, c.actions.clarity],
    ['documented_current_nonconformance', c.nonconformance, c.actions.nonconformance],
    ['handoff_operability', c.operability, c.actions.handoff],
    ['handoff_criterion_coverage', c.coverage, c.actions.handoff]
  ] as const
  return (
    <section className="space-y-4" data-testid="jev-delivery-results">
      <div className="space-y-3 border-b border-border pb-4" data-testid="jev-result-summary">
        <p className="text-xs text-muted-foreground">{guide.heading}</p>
        <h4 className="text-base font-medium">{summary.title}</h4>
        <p className="text-sm">{summary.meaning}</p>
        <Badge variant="outline">{c.reviewRequired}</Badge>
        <div className="space-y-1">
          <h5 className="text-sm font-medium">{guide.next}</h5>
          <p className="text-sm">{summary.action}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {evidenceActionable && (
            <Button
              size="sm"
              disabled={disabled || evidenceAccepted || !canAdopt}
              onClick={() => onAccept(receipt.id, 'criterion_evidence')}
            >
              {evidenceAccepted ? legacy.accepted : legacy.accept}
            </Button>
          )}
          {hasRecordedIssue && onIssues && (
            <Button size="sm" variant="outline" disabled={navigationDisabled} onClick={onIssues}>
              {guide.issues}
            </Button>
          )}
          {onRecheck && (
            <Button size="sm" variant="outline" disabled={navigationDisabled} onClick={onRecheck}>
              {guide.recheck}
            </Button>
          )}
        </div>
      </div>
      {receipt.basis && (
        <p className="whitespace-pre-wrap break-words text-sm">
          {c.criterion} · {receipt.basis.criterion}
        </p>
      )}
      <details className="space-y-3" data-testid="jev-check-details">
        <summary className="cursor-pointer text-sm font-medium">{guide.details}</summary>
        <p className="text-xs text-muted-foreground">{guide.confidenceHint}</p>
        {questions.map(([question, label, action]) => {
          const answer = receipt.result?.answers[question]
          const actionable = answer && canRecordJevAnswer(question, answer)
          const accepted = review.issues.some((issue) =>
            issue.detail.includes(`[Jev:${receipt.id}:${question}]`)
          )
          return (
            <div key={question} className="space-y-2 border-t border-border pt-3">
              <h5 className="text-sm font-medium">{guide.questions[question]}</h5>
              <p className="text-xs text-muted-foreground">
                {label} · {guide.questionHints[question]}
              </p>
              {answer ? (
                <JevNativeAnswer answer={answer} question={question} />
              ) : (
                <p className="text-sm">{guide.missingAnswer}</p>
              )}
              {actionable && question !== 'criterion_evidence' && (
                <>
                  <p className="text-xs text-muted-foreground">
                    {c.actionLabel}: {action}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled || accepted || !canAdopt}
                    onClick={() => onAccept(receipt.id, question)}
                  >
                    {accepted ? legacy.accepted : legacy.accept}
                  </Button>
                </>
              )}
            </div>
          )
        })}
      </details>
    </section>
  )
}
