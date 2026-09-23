import { useRef } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ContextualTourProgressDots } from '../contextual-tours/ContextualTourProgressDots'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { WorkspaceReviewTargetPicker } from './WorkspaceReviewTargetPicker'
import { WorkspaceReviewFilePicker } from './WorkspaceReviewFilePicker'
import { WorkspaceReviewOptions } from './WorkspaceReviewOptions'
import { WorkspaceReviewStepHelp } from './WorkspaceReviewStepHelp'
import type { useWorkspaceReviewIntake } from './use-workspace-review-intake'
import { workspaceReviewCopy } from './workspace-review-copy'
import { workspaceReviewGuideCopy } from './workspace-review-guide-copy'
import { reviewCopy } from './review-copy'

export function WorkspaceReviewGuide({
  active,
  editing,
  form,
  onCancel
}: {
  active: boolean
  editing: boolean
  form: ReturnType<typeof useWorkspaceReviewIntake>
  onCancel?: () => void
}): React.JSX.Element {
  const c = workspaceReviewCopy()
  const g = workspaceReviewGuideCopy()
  const r = reviewCopy()
  const anchorRef = useRef<HTMLDivElement>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const { target, selection, busy, loading, focus } = form
  const current = form.step
  const title = current === 1 ? g.projectTitle : current === 2 ? g.goalTitle : g.filesTitle
  const hint = current === 1 ? g.projectHint : current === 2 ? g.goalHint : g.filesHint
  const ready = Boolean(
    target?.available &&
    (current === 1 || (focus.trim() && (current === 2 || selection.files.length)))
  )
  const help = ready
    ? current === 1
      ? g.projectReady
      : current === 2
        ? g.goalReady
        : editing
          ? g.filesUpdateReady
          : g.filesReady
    : current === 1
      ? g.projectHelp
      : current === 2
        ? g.goalHelp
        : g.filesHelp
  const continueReview = (): void => {
    if (!ready || busy || loading) {
      return
    }
    if (current === 3) {
      void form.submit()
    } else {
      form.setStep(current === 1 ? 2 : 3)
    }
  }
  return (
    <form
      className="rounded-lg border border-border bg-card"
      data-testid="workspace-review-guide"
      onSubmit={(event) => {
        event.preventDefault()
        continueReview()
      }}
    >
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ContextualTourProgressDots current={current} total={3} />
          {current > 1 && (
            <p className="text-xs text-muted-foreground">
              {g.selectedProject} · {target?.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-base font-semibold">{title}</h4>
            <WorkspaceReviewStepHelp
              active={active}
              key={current}
              anchorRef={ready ? actionRef : anchorRef}
              progress={{ current, total: 3 }}
              placement={ready ? 'top' : current === 1 ? 'right' : 'top'}
              title={ready ? g.nextAction : title}
              body={current === 1 && target && !target.available ? g.projectUnavailable : help}
              label={g.help}
              closeLabel={g.closeHelp}
            />
          </div>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        <div className="space-y-4" data-testid={`workspace-review-step-${current}`}>
          {current === 1 && (
            <>
              <div ref={anchorRef} className="w-fit max-w-full">
                <WorkspaceReviewTargetPicker
                  targets={form.targets}
                  value={form.workspaceId}
                  disabled={loading || busy || editing}
                  onChange={form.chooseTarget}
                />
              </div>
              {target && (
                <p className="break-all text-xs text-muted-foreground">{target.rootPath}</p>
              )}
              {target && !target.available && (
                <p role="status" className="text-sm text-muted-foreground">
                  {target.unavailableReason ?? c.unsupported}
                </p>
              )}
              {!loading && !form.targets.length && !form.error && (
                <p className="text-sm text-muted-foreground">{c.noTargets}</p>
              )}
            </>
          )}
          {current === 2 && (
            <div ref={anchorRef} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {g.presets.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || Boolean(focus.trim())}
                    onClick={() => form.setFocus(preset.goal)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div>
                <Textarea
                  id="workspace-review-focus"
                  aria-label={c.focus}
                  value={focus}
                  placeholder={c.focusPlaceholder}
                  maxLength={2000}
                  disabled={busy}
                  onChange={(event) => form.setFocus(event.target.value)}
                />
              </div>
            </div>
          )}
          {current === 3 && (
            <>
              <p className="break-words text-sm text-muted-foreground">
                {c.focus}：{focus}
              </p>
              <WorkspaceReviewFilePicker
                key={form.workspaceId}
                target={active ? target : undefined}
                selected={selection.files}
                guideAnchorRef={anchorRef}
                disabled={busy}
                onChange={(files) => form.setSelection((value) => ({ ...value, files }))}
              />
              <details className="space-y-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  {g.options}
                </summary>
                <WorkspaceReviewOptions
                  key={form.workspaceId}
                  selection={selection}
                  disabled={busy}
                  onChange={form.setSelection}
                />
              </details>
            </>
          )}
        </div>
        {form.error && (
          <p role="alert" className="text-sm text-destructive">
            {form.error}
          </p>
        )}
        {current === 3 && <p className="text-xs text-muted-foreground">{c.prepareNote}</p>}
      </div>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card p-4">
        <div className="flex gap-2">
          {current > 1 && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy || loading}
              onClick={() => form.setStep(current === 3 ? 2 : 1)}
            >
              <ArrowLeft />
              {g.back}
            </Button>
          )}
          {onCancel && (
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
              {r.close}
            </Button>
          )}
        </div>
        <Button ref={actionRef} disabled={!ready || busy || loading}>
          {busy
            ? c.preparing
            : current === 1
              ? g.nextGoal
              : current === 2
                ? g.nextFiles
                : editing
                  ? c.update
                  : c.prepare}
          {current < 3 && <ArrowRight />}
        </Button>
      </div>
    </form>
  )
}
