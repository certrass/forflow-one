import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { workspaceReviewCopy } from './workspace-review-copy'
import { workspaceReviewGuideCopy } from './workspace-review-guide-copy'
import { reviewIntakeCopy } from './review-intake-copy'
import type { useWorkspaceReviewIntake } from './use-workspace-review-intake'

export function WorkspaceReviewGoal({
  form
}: {
  form: ReturnType<typeof useWorkspaceReviewIntake>
}): React.JSX.Element {
  const c = workspaceReviewCopy()
  const g = workspaceReviewGuideCopy()
  const q = reviewIntakeCopy()
  if (form.clarifyingGoal) {
    return (
      <div className="space-y-4" data-testid="review-goal-clarification">
        <p className="whitespace-pre-wrap break-words text-sm">{form.focus}</p>
        <div className="space-y-2">
          <Label htmlFor="review-acceptance">{q.acceptance}</Label>
          <Textarea
            id="review-acceptance"
            value={form.acceptance}
            placeholder={q.acceptancePlaceholder}
            maxLength={2000}
            disabled={form.busy}
            aria-invalid={form.preparedFocus.length > 2000}
            onChange={(event) => form.setAcceptance(event.target.value)}
          />
        </div>
        {form.preparedFocus.length > 2000 && (
          <p role="alert" className="text-sm text-destructive">
            {q.tooLong}
          </p>
        )}
        {form.acceptance.trim() && (
          <div className="space-y-1">
            <h5 className="text-sm font-medium">{q.preview}</h5>
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {form.preparedFocus}
            </p>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={form.busy}
          onClick={() => form.useGoal(q.unresolved)}
        >
          {q.unknown}
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {g.presets.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            disabled={form.busy || Boolean(form.focus.trim())}
            onClick={() => form.setFocus(preset.goal)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Textarea
        id="workspace-review-focus"
        aria-label={c.focus}
        value={form.focus}
        placeholder={c.focusPlaceholder}
        maxLength={2000}
        disabled={form.busy}
        onChange={(event) => form.setFocus(event.target.value)}
      />
      {!form.goalPrepared && form.focus.trim() && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={form.busy}
          onClick={() => form.useGoal()}
        >
          {q.direct}
        </Button>
      )}
    </div>
  )
}
