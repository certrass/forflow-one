import { useState } from 'react'
import type { CodexReview, CodexReviewMutation } from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { reviewCopy } from './review-copy'

export function CodexReviewFindings({
  review,
  evidenceKey,
  busy,
  readOnly,
  mutate,
  onLocate,
  onClearEvidence
}: {
  review: CodexReview
  evidenceKey: string | null
  busy: boolean
  readOnly: boolean
  onLocate: (versionId: string, key: string) => void
  mutate: (action: CodexReviewMutation['action']) => Promise<boolean>
  onClearEvidence: () => void
}): React.JSX.Element {
  const c = reviewCopy()
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [decision, setDecision] = useState<{
    id: string
    status: 'resolved' | 'dismissed' | 'open'
  } | null>(null)
  const [reason, setReason] = useState('')
  return (
    <div className="space-y-4" data-testid="review-issues">
      {!review.issues.length && <p className="py-4 text-sm text-muted-foreground">{c.noIssues}</p>}
      {review.issues.map((issue) => (
        <article key={issue.id} className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-sm font-medium">{issue.title}</h4>
            <Badge variant="outline">
              {issue.status === 'open'
                ? c.openStatus
                : issue.status === 'resolved'
                  ? c.resolved
                  : c.dismissed}
            </Badge>
          </div>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{issue.detail}</p>
          <p className="text-xs text-muted-foreground">
            {c.version} v
            {review.versions.findIndex((version) => version.id === issue.versionId) + 1} ·{' '}
            {issue.evidenceKey ? c.recordIssue : c.scopeIssue}
          </p>
          {issue.evidenceKey && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                if (issue.evidenceKey) {
                  onLocate(issue.versionId, issue.evidenceKey)
                }
              }}
            >
              {c.locate}
            </Button>
          )}
          {issue.resolution && <p className="text-xs">{issue.resolution}</p>}
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {issue.status === 'open' ? (
                <>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={busy}
                    onClick={() => {
                      setDecision({ id: issue.id, status: 'resolved' })
                      setReason('')
                    }}
                  >
                    {c.resolve}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={busy}
                    onClick={() => {
                      setDecision({ id: issue.id, status: 'dismissed' })
                      setReason('')
                    }}
                  >
                    {c.dismiss}
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={busy}
                  onClick={() => {
                    setDecision({ id: issue.id, status: 'open' })
                    setReason('')
                  }}
                >
                  {c.reopen}
                </Button>
              )}
            </div>
          )}
          {!readOnly && decision?.id === issue.id && (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                void mutate({
                  type: 'resolve',
                  issueId: decision.id,
                  status: decision.status,
                  reason
                }).then((ok) => {
                  if (ok) {
                    setDecision(null)
                  }
                })
              }}
            >
              <Textarea
                aria-label={c.reason}
                placeholder={c.reason}
                maxLength={4000}
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <Button size="sm" disabled={busy || !reason.trim()}>
                {c.apply}
              </Button>
            </form>
          )}
        </article>
      ))}
      {!readOnly && (
        <form
          className="space-y-3 rounded-md border border-border p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void mutate({
              type: 'issue',
              title,
              detail,
              ...(evidenceKey ? { evidenceKey } : {})
            }).then((ok) => {
              if (ok) {
                setTitle('')
                setDetail('')
                onClearEvidence()
              }
            })
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium">{c.addIssue}</h4>
            {evidenceKey && (
              <Button type="button" variant="ghost" size="xs" onClick={onClearEvidence}>
                {c.scopeIssue}
              </Button>
            )}
          </div>
          <p className="break-all text-xs text-muted-foreground">
            {evidenceKey ? `${c.recordIssue} · ${evidenceKey.slice(0, 12)}` : c.scopeIssue}
          </p>
          <Input
            aria-label={c.issueTitle}
            placeholder={c.issueTitle}
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            aria-label={c.issueDetail}
            placeholder={c.issueDetail}
            maxLength={4000}
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />
          <Button size="sm" disabled={busy || !title.trim()}>
            {c.addIssue}
          </Button>
        </form>
      )}
    </div>
  )
}
