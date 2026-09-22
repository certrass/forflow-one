import type { CodexReview } from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { WorkspaceReviewTargetPicker } from './WorkspaceReviewTargetPicker'
import { WorkspaceReviewFilePicker } from './WorkspaceReviewFilePicker'
import { WorkspaceReviewOptions } from './WorkspaceReviewOptions'
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
  const r = reviewCopy()
  const form = useWorkspaceReviewIntake(active, initial, onOpenReview)
  const { target, selection, busy, loading } = form
  return (
    <section className="space-y-6" data-testid="workspace-review-intake">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-medium">{c.title}</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">{c.description}</p>
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
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          void form.submit()
        }}
      >
        <section className="space-y-2">
          <Label>{c.targetStep}</Label>
          <WorkspaceReviewTargetPicker
            targets={form.targets}
            value={form.workspaceId}
            disabled={loading || busy || Boolean(initial)}
            onChange={form.chooseTarget}
          />
          {target && <p className="break-all text-xs text-muted-foreground">{target.rootPath}</p>}
          {target && !target.available && (
            <p role="status" className="text-sm text-muted-foreground">
              {target.unavailableReason ?? c.unsupported}
            </p>
          )}
          {!loading && form.targets.length === 0 && !form.error && (
            <p className="text-sm text-muted-foreground">{c.noTargets}</p>
          )}
        </section>
        <section className="space-y-2">
          <Label htmlFor="workspace-review-focus">{c.focusStep}</Label>
          <p className="text-xs text-muted-foreground">{c.focusHint}</p>
          <Textarea
            id="workspace-review-focus"
            aria-label={c.focus}
            value={form.focus}
            placeholder={c.focusPlaceholder}
            maxLength={2000}
            disabled={busy}
            onChange={(event) => form.setFocus(event.target.value)}
          />
        </section>
        <section className="space-y-3">
          <h4 className="text-sm font-medium">{c.filesStep}</h4>
          <p className="text-xs text-muted-foreground">{c.fileNote}</p>
          <WorkspaceReviewFilePicker
            key={form.workspaceId}
            target={active ? target : undefined}
            selected={selection.files}
            disabled={busy}
            onChange={(files) => form.setSelection((current) => ({ ...current, files }))}
          />
        </section>
        <WorkspaceReviewOptions
          key={form.workspaceId}
          selection={selection}
          disabled={busy}
          onChange={form.setSelection}
        />
        {form.error && (
          <p role="alert" className="text-sm text-destructive">
            {form.error}
          </p>
        )}
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">{c.prepareNote}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                busy ||
                loading ||
                !target?.available ||
                !form.focus.trim() ||
                !selection.files.length
              }
            >
              {busy ? c.preparing : initial ? c.update : c.prepare}
            </Button>
            {onCancel && (
              <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
                {r.close}
              </Button>
            )}
          </div>
        </div>
      </form>
      {!initial && (
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
