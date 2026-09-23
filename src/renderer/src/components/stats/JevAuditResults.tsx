import type { JevReceipt, JevAuditApi } from '../../../../shared/jev-audit-types'
import type { CodexReview } from '../../../../shared/codex-review-types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { jevAuditCopy } from './jev-audit-copy'
import { reviewCopy } from './review-copy'
import { JevDeliveryResults } from './JevDeliveryResults'
import { jevDeliveryCopy } from './jev-delivery-copy'
import { jevDeliverySources } from './jev-delivery-sources'
import {
  canRecordJevAnswer,
  hasCurrentJevEvaluator
} from '../../../../shared/jev-delivery-assessment'

export function JevAuditResults({
  receipts,
  review,
  busy,
  readOnly,
  onAccept,
  onLocate,
  onIssues,
  onRecheck
}: {
  receipts: JevReceipt[]
  review: CodexReview
  busy: boolean
  readOnly: boolean
  onAccept: (receiptId: string, question: Parameters<JevAuditApi['accept']>[0]['question']) => void
  onLocate?: (key: string) => void
  onIssues?: () => void
  onRecheck?: () => void
}): React.JSX.Element {
  const c = jevAuditCopy()
  const r = reviewCopy()
  const d = jevDeliveryCopy()
  const choices: Record<string, string> = {
    attention: c.attention,
    none: c.none,
    unknown: c.unknown,
    sufficient: c.sufficient,
    missing: c.missing,
    supported: c.supported,
    conflict: c.conflict
  }
  const statuses = {
    completed: c.completed,
    pending: c.pending,
    rejected: c.rejected,
    unknown: c.uncertain
  }
  const questions = { outcome: c.outcome, evidence: c.evidence, claim: c.claimCheck }
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-medium">{c.history}</h4>
      {receipts.length === 0 && <p className="text-sm text-muted-foreground">{c.noCalls}</p>}
      {receipts
        .slice(-20)
        .toReversed()
        .map((receipt) => {
          const delivery = receipt.mode === 'delivery'
          const current = hasCurrentJevEvaluator(receipt)
          const version = review.versions.find((entry) => entry.id === receipt.versionId)
          const sources = version ? jevDeliverySources(version) : []
          return (
            <article key={receipt.id} className="space-y-3 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{statuses[receipt.status]}</Badge>
                <Badge variant="outline">{delivery ? d.delivery : d.record}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(receipt.createdAt).toLocaleString()} · {receipt.requestedModel}
                </span>
              </div>
              {!current && <p className="text-xs text-muted-foreground">{d.stale}</p>}
              {onLocate &&
                (receipt.evidenceKeys ?? [receipt.evidenceKey]).map((key) => (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="max-w-full"
                    disabled={busy}
                    key={key}
                    onClick={() => onLocate(key)}
                  >
                    <span className="truncate">
                      {r.locate}
                      {delivery
                        ? ` · ${sources.find((source) => source.key === key)?.label ?? key}`
                        : ''}
                    </span>
                  </Button>
                ))}
              {receipt.error && (
                <p role="alert" className="text-sm text-destructive">
                  {receipt.error}
                </p>
              )}
              {receipt.result && (
                <>
                  {delivery ? (
                    <JevDeliveryResults
                      receipt={receipt}
                      review={review}
                      disabled={busy || readOnly || !current || receipt.status !== 'completed'}
                      onAccept={onAccept}
                      onIssues={onIssues}
                      onRecheck={onRecheck}
                      navigationDisabled={busy}
                    />
                  ) : (
                    (['outcome', 'evidence', 'claim'] as const).map((question) => {
                      const answer = receipt.result?.answers[question]
                      if (!answer || answer.type !== 'choice') {
                        return null
                      }
                      const actionable = canRecordJevAnswer(question, answer)
                      const accepted = review.issues.some((issue) =>
                        issue.detail.includes(`[Jev:${receipt.id}:${question}]`)
                      )
                      return (
                        <div
                          key={question}
                          className="flex flex-wrap items-center justify-between gap-2"
                        >
                          <p className="text-sm">
                            {questions[question]} · {choices[answer.choice] ?? answer.choice}
                          </p>
                          {actionable && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                busy ||
                                readOnly ||
                                accepted ||
                                !current ||
                                receipt.status !== 'completed'
                              }
                              onClick={() => onAccept(receipt.id, question)}
                            >
                              {accepted ? c.accepted : c.accept}
                            </Button>
                          )}
                        </div>
                      )
                    })
                  )}
                  <p className="text-xs text-muted-foreground">
                    {c.inputTokens}: {receipt.result.usage.input_tokens} · {c.outputTokens}:{' '}
                    {receipt.result.usage.output_tokens} · {c.noBill}
                  </p>
                  <details className="space-y-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      {c.probabilities}
                    </summary>
                    <p className="text-xs text-muted-foreground">{c.calibration}</p>
                    <pre className="scrollbar-sleek max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(
                        {
                          model: receipt.result.model,
                          questionVersion: receipt.questionVersion,
                          versionId: receipt.versionId,
                          inputHash: receipt.inputHash,
                          basis: receipt.basis,
                          evidenceKeys: receipt.evidenceKeys,
                          handoffEvidenceKeys: receipt.handoffEvidenceKeys,
                          answers: receipt.result.answers
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                </>
              )}
            </article>
          )
        })}
    </section>
  )
}
