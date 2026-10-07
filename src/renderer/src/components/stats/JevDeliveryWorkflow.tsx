import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CodexReviewVersion } from '../../../../shared/codex-review-types'
import type { JevPreview } from '../../../../shared/jev-audit-types'
import { Button } from '../ui/button'
import { ReviewStepProgress } from './ReviewStepProgress'
import { WorkspaceReviewStepHelp } from './WorkspaceReviewStepHelp'
import { JevDeliveryInput } from './JevDeliveryInput'
import { JevRequestPreview } from './JevRequestPreview'
import { jevAuditCopy } from './jev-audit-copy'
import { jevGuideCopy } from './jev-guide-copy'

type Step = 1 | 2 | 3 | 4

export function JevDeliveryWorkflow({
  version,
  active,
  busy,
  readOnly,
  preview,
  hasResults,
  onPrepare,
  onSend,
  onDiscard,
  onLocate,
  onEditGoal,
  onEditSources,
  onReread,
  renderResults
}: {
  version: CodexReviewVersion
  active: boolean
  busy: boolean
  readOnly: boolean
  preview: JevPreview | null
  hasResults: boolean
  onPrepare: (keys: string[], handoff: string[]) => Promise<boolean>
  onSend: () => Promise<boolean>
  onDiscard: () => void
  onLocate?: (key: string) => void
  onEditGoal?: () => void
  onEditSources?: () => void
  onReread?: () => void
  renderResults: (onRecheck: () => void) => ReactNode
}): React.JSX.Element {
  const c = jevAuditCopy()
  const g = jevGuideCopy()
  const [step, setStep] = useState<Step | undefined>()
  const [keys, setKeys] = useState<string[]>([])
  const [handoff, setHandoff] = useState<string[]>([])
  const workflowRef = useRef<HTMLElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const current = readOnly
    ? hasResults
      ? 4
      : 1
    : step === 3 && !preview
      ? 2
      : (step ?? (hasResults ? 4 : 1))
  useEffect(() => {
    if (active) {
      workflowRef.current?.scrollIntoView({ block: 'start' })
    }
  }, [active, current])
  const title = [g.goal, g.materials, g.preview, g.results][current - 1]
  const hint = [g.goalHint, g.materialsHint, g.previewHint, g.resultHint][current - 1]
  const help = [
    g.goalHelp,
    keys.length ? g.selectedHelp : g.materialHelp,
    g.previewHelp,
    g.resultHelp
  ][current - 1]
  const go = (next: Step): void => {
    if (!busy) {
      onDiscard()
      setStep(next)
    }
  }
  return (
    <section
      ref={workflowRef}
      className="scroll-mt-4 space-y-4"
      data-testid="jev-delivery-workflow"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReviewStepProgress current={current} steps={[g.goal, g.materials, g.preview, g.results]} />
        <WorkspaceReviewStepHelp
          initiallyOpen={false}
          active={active}
          anchorRef={current < 3 && (current === 1 || keys.length > 0) ? actionRef : anchorRef}
          title={title}
          body={help}
          label={g.help}
          closeLabel={g.close}
          progress={{ current, total: 4 }}
          placement={current === 2 && keys.length > 0 ? 'bottom' : 'top'}
        />
      </div>
      <div ref={anchorRef} className="space-y-2">
        <h4 className="text-base font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {current === 1 && (
        <div className="space-y-3" data-testid="jev-guide-goal">
          <p className="whitespace-pre-wrap break-words text-sm">{version.focus}</p>
          <p className="text-xs text-muted-foreground">{g.example}</p>
          {onEditGoal && !readOnly && (
            <Button variant="outline" size="default" disabled={busy} onClick={onEditGoal}>
              {g.editGoal}
            </Button>
          )}
        </div>
      )}
      {current === 2 && (
        <>
          <JevDeliveryInput
            version={version}
            evidenceKeys={keys}
            handoffEvidenceKeys={handoff}
            busy={busy}
            onLocate={onLocate}
            onChange={(nextKeys, nextHandoff) => {
              setKeys(nextKeys)
              setHandoff(nextHandoff)
              onDiscard()
            }}
          />
          <div className="flex flex-wrap gap-2">
            {onEditSources && (
              <Button variant="outline" size="default" disabled={busy} onClick={onEditSources}>
                {g.editSources}
              </Button>
            )}
            {onReread && (
              <Button variant="ghost" size="default" disabled={busy} onClick={onReread}>
                {g.reread}
              </Button>
            )}
          </div>
        </>
      )}
      {current === 3 && preview && (
        <div className="space-y-4" data-testid="jev-guide-preview">
          <div className="space-y-1">
            <h5 className="text-sm font-medium">{g.questions}</h5>
            <p className="text-sm text-muted-foreground">{g.questionList}</p>
          </div>
          <p className="text-sm text-muted-foreground">{c.external}</p>
          <p className="text-xs text-muted-foreground">{c.preview}</p>
          <JevRequestPreview body={preview.body} />
        </div>
      )}
      {current === 4 && renderResults(() => go(2))}
      {readOnly && !hasResults && <p className="text-sm text-muted-foreground">{c.noCalls}</p>}
      {!readOnly && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background py-4">
          <div className="flex flex-wrap gap-2">
            {(current === 2 || current === 3) && (
              <Button
                variant="ghost"
                size="default"
                disabled={busy}
                onClick={() => go(current === 2 ? 1 : 2)}
              >
                {g.back}
              </Button>
            )}
            {current !== 4 && hasResults && (
              <Button variant="ghost" size="default" disabled={busy} onClick={() => go(4)}>
                {g.history}
              </Button>
            )}
            {current === 4 && onEditSources && (
              <Button variant="outline" size="default" disabled={busy} onClick={onEditSources}>
                {g.editSources}
              </Button>
            )}
            {current === 4 && onReread && (
              <Button variant="outline" size="default" disabled={busy} onClick={onReread}>
                {g.reread}
              </Button>
            )}
          </div>
          {current === 1 && (
            <Button
              ref={actionRef}
              size="default"
              disabled={busy || !version.focus.trim()}
              onClick={() => go(2)}
            >
              {g.choose}
            </Button>
          )}
          {current === 2 && (
            <Button
              ref={actionRef}
              size="default"
              disabled={busy || keys.length === 0}
              onClick={async () => {
                if (await onPrepare(keys, handoff)) {
                  setStep(3)
                }
              }}
            >
              {c.prepare}
            </Button>
          )}
          {current === 3 && (
            <Button
              ref={actionRef}
              size="default"
              disabled={busy}
              onClick={async () => {
                if (await onSend()) {
                  setStep(4)
                }
              }}
            >
              {c.send}
            </Button>
          )}
          {current === 4 && (
            <Button size="default" disabled={busy} onClick={() => go(1)}>
              {g.again}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
