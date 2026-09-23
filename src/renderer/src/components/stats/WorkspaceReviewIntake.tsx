import type { CodexReview } from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { WorkspaceReviewGuide } from './WorkspaceReviewGuide'
import { workspaceReviewGuideCopy } from './workspace-review-guide-copy'
import { useWorkspaceReviewIntake } from './use-workspace-review-intake'
import { workspaceReviewCopy } from './workspace-review-copy'
import { reviewCopy } from './review-copy'

export function WorkspaceReviewIntake({
  active,
  initial,
  onOpenReview,
  onCancel
}: {
  active: boolean
  initial?: CodexReview
  onOpenReview: (review: CodexReview) => void
  onCancel?: () => void
}): React.JSX.Element {
  const c = workspaceReviewCopy()
  const g = workspaceReviewGuideCopy()
  const r = reviewCopy()
  const form = useWorkspaceReviewIntake(active, initial, onOpenReview)
  const { busy, loading } = form
  return (
    <section className="space-y-6" data-testid="workspace-review-intake">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-medium">{g.title}</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">{g.description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading || busy}
          onClick={form.refresh}
        >
          {r.refresh}
        </Button>
      </div>
      <WorkspaceReviewGuide
        active={active}
        editing={Boolean(initial)}
        form={form}
        onCancel={onCancel}
      />
      {!initial && form.saved.length > 0 && (
        <section className="space-y-3 border-t border-border pt-5">
          <h4 className="text-sm font-medium">{c.saved}</h4>
          {form.saved.map((review) => (
            <div
              key={review.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="break-words text-sm">
                  {review.versions.at(-1)?.workspace?.target.name ?? review.id}
                </p>
                <p className="break-words text-sm text-muted-foreground">
                  {review.versions.at(-1)?.focus}
                </p>
                <p className="text-xs text-muted-foreground">
                  {review.issues.filter((issue) => issue.status === 'open').length} {r.hasIssues}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => onOpenReview(review)}
              >
                {r.open}
              </Button>
            </div>
          ))}
          {!loading && !form.saved.length && (
            <p className="text-sm text-muted-foreground">{c.noSaved}</p>
          )}
        </section>
      )}
    </section>
  )
}
