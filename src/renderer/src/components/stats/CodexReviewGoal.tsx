import { useEffect, useRef, type RefObject } from 'react'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { reviewCopy } from './review-copy'

export function CodexReviewGoal({
  active,
  busy,
  focus,
  changed,
  open,
  focusRequested,
  onOpenChange,
  onChange,
  onSave
}: {
  active: boolean
  busy: boolean
  focus: string
  changed: boolean
  open: boolean
  focusRequested: RefObject<boolean>
  onOpenChange: (open: boolean) => void
  onChange: (focus: string) => void
  onSave: () => void
}): React.JSX.Element {
  const c = reviewCopy()
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (active && !busy && open && focusRequested.current && input.current) {
      focusRequested.current = false
      input.current.focus({ preventScroll: true })
      input.current.scrollIntoView({ block: 'center' })
    }
  }, [active, busy, open, focusRequested])
  return (
    <details
      className="space-y-3"
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-xs text-muted-foreground">{c.focus}</summary>
      <Label htmlFor="codex-review-focus">{c.focus}</Label>
      <Textarea
        ref={input}
        id="codex-review-focus"
        value={focus}
        disabled={busy}
        maxLength={2000}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button size="sm" disabled={busy || !focus.trim() || !changed} onClick={onSave}>
        {translate('forflow.jevGuide.saveGoal', 'Save goal and reread current records')}
      </Button>
    </details>
  )
}
