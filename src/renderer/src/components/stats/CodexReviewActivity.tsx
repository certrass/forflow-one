import { useState } from 'react'
import { Bot, Check, GitCommitHorizontal, MessageSquare, CircleAlert } from 'lucide-react'
import type { CodexReview, CodexReviewMutation } from '../../../../shared/codex-review-types'
import type { JevReceipt } from '../../../../shared/jev-audit-types'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { buildReviewActivity } from './codex-review-activity'
import { reviewCopy } from './review-copy'
import { reviewWorkspaceCopy } from './review-workspace-copy'
import { jevAuditCopy } from './jev-audit-copy'

export function CodexReviewActivity({
  review,
  receipts,
  busy,
  readOnly,
  mutate,
  onLocate,
  onVersion,
  onChecks
}: {
  review: CodexReview
  receipts: JevReceipt[]
  busy: boolean
  readOnly: boolean
  mutate: (action: CodexReviewMutation['action']) => Promise<boolean>
  onLocate: (versionId: string, key: string) => void
  onVersion: (versionId: string) => void
  onChecks: (versionId: string) => void
}): React.JSX.Element {
  const c = reviewCopy()
  const w = reviewWorkspaceCopy()
  const j = jevAuditCopy()
  const [comment, setComment] = useState('')
  const [limit, setLimit] = useState(20)
  const events = buildReviewActivity(review, receipts)
  const labels = {
    version: w.saved,
    issue: w.issue,
    comment: w.comment,
    confirmation: w.confirmed,
    check: w.check
  }
  const icons = {
    version: GitCommitHorizontal,
    issue: CircleAlert,
    comment: MessageSquare,
    confirmation: Check,
    check: Bot
  }
  const statuses = {
    completed: j.completed,
    pending: j.pending,
    rejected: j.rejected,
    unknown: j.uncertain
  }
  return (
    <section className="space-y-4" data-testid="review-activity">
      <h4 className="flex items-center gap-2 text-base font-medium">
        {w.activity}
        <span className="text-sm text-muted-foreground">{events.length}</span>
      </h4>
      {events.length > limit && (
        <Button variant="ghost" size="sm" onClick={() => setLimit(limit + 20)}>
          {w.more}
        </Button>
      )}
      <ol className="space-y-3">
        {events.slice(-limit).map((entry) => {
          const Icon = icons[entry.kind]
          const index = review.versions.findIndex((version) => version.id === entry.versionId)
          return (
            <li key={entry.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {entry.kind === 'check' ? entry.text : c.localReviewer} · {labels[entry.kind]}{' '}
                      · v{index + 1}
                    </span>
                    <time dateTime={new Date(entry.timestamp).toISOString()}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </time>
                  </div>
                  {entry.kind !== 'check' && entry.text && (
                    <p className="whitespace-pre-wrap break-words text-sm">{entry.text}</p>
                  )}
                  {entry.check && <Badge variant="outline">{statuses[entry.check.status]}</Badge>}
                  <div className="flex flex-wrap gap-2">
                    {entry.evidenceKey && (
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onLocate(entry.versionId, entry.evidenceKey!)}
                      >
                        {c.locate}
                      </Button>
                    )}
                    {entry.kind === 'version' && (
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onVersion(entry.versionId)}
                      >
                        {w.viewVersion}
                      </Button>
                    )}
                    {entry.kind === 'check' && (
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onChecks(entry.versionId)}
                      >
                        {w.viewChecks}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      {!readOnly && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void mutate({ type: 'comment', text: comment }).then((ok) => {
              if (ok) {
                setComment('')
              }
            })
          }}
        >
          <Textarea
            aria-label={c.comment}
            placeholder={c.comment}
            maxLength={4000}
            value={comment}
            disabled={busy}
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="flex justify-end">
            <Button size="sm" disabled={busy || !comment.trim()}>
              {c.addComment}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
