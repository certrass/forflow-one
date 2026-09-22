import type { JevReceipt } from '../../../../shared/jev-audit-types'
import type { CodexReview } from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { jevDeliveryCopy } from './jev-delivery-copy'
import { jevAuditCopy } from './jev-audit-copy'
import { JevNativeAnswer } from './JevNativeAnswer'
import { canRecordJevAnswer } from '../../../../shared/jev-delivery-assessment'

export function JevDeliveryResults({
  receipt,
  review,
  disabled,
  onAccept
}: {
  receipt: JevReceipt
  review: CodexReview
  disabled: boolean
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
  const questions = [
    ['criterion_evidence', c.evidence, c.actions.evidence],
    ['criterion_clarity', c.clarity, c.actions.clarity],
    ['documented_current_nonconformance', c.nonconformance, c.actions.nonconformance],
    ['handoff_operability', c.operability, c.actions.handoff],
    ['handoff_criterion_coverage', c.coverage, c.actions.handoff]
  ] as const
  return (
    <section className="space-y-4" data-testid="jev-delivery-results">
      <Badge variant="outline">{c.reviewRequired}</Badge>
      {receipt.basis && (
        <p className="whitespace-pre-wrap break-words text-sm">
          {c.criterion} · {receipt.basis.criterion}
        </p>
      )}
      {questions.map(([question, label, action]) => {
        const answer = receipt.result?.answers[question]
        if (!answer) {
          return null
        }
        const actionable = canRecordJevAnswer(question, answer)
        const accepted = review.issues.some((issue) =>
          issue.detail.includes(`[Jev:${receipt.id}:${question}]`)
        )
        return (
          <div key={question} className="space-y-2 border-t border-border pt-3">
            <h5 className="text-sm font-medium">{label}</h5>
            <JevNativeAnswer answer={answer} />
            {actionable && (
              <>
                <p className="text-xs text-muted-foreground">
                  {c.actionLabel}: {action}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled || accepted}
                  onClick={() => onAccept(receipt.id, question)}
                >
                  {accepted ? legacy.accepted : legacy.accept}
                </Button>
              </>
            )}
          </div>
        )
      })}
    </section>
  )
}
