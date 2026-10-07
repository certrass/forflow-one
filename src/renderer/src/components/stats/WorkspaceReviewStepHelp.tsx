import { createPortal } from 'react-dom'
import { useEffect, useId, useState, type ReactNode, type RefObject } from 'react'
import { CircleHelp } from 'lucide-react'
import { useAppStore } from '@/store'
import type { ContextualTourStepPlacement } from '../../../../shared/contextual-tours'
import { Button } from '../ui/button'
import { ContextualTourCallout } from '../contextual-tours/ContextualTourCallout'

type WorkspaceReviewStepHelpProps = {
  active?: boolean
  initiallyOpen?: boolean
  anchorRef: RefObject<HTMLElement | null>
  title: string
  body: string
  label: string
  closeLabel: string
  progress: { current: number; total: number }
  placement?: ContextualTourStepPlacement
  children?: ReactNode
  actions?: ReactNode
}

export function WorkspaceReviewStepHelp({
  active = true,
  initiallyOpen = true,
  anchorRef,
  title,
  body,
  label,
  closeLabel,
  progress,
  placement = 'right',
  children,
  actions
}: WorkspaceReviewStepHelpProps): React.JSX.Element {
  const [open, setOpen] = useState(initiallyOpen)
  const id = useId()
  const globalTourActive = useAppStore((state) => state.activeContextualTourId !== null)
  const visible = active && !globalTourActive
  useEffect(() => {
    if (!open || !visible) {
      return
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        event.stopImmediatePropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, visible])
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-controls={visible && open ? id : undefined}
        aria-expanded={visible && open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <CircleHelp />
        {label}
      </Button>
      {visible &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] pointer-events-none"
            data-workspace-review-step-help=""
          >
            <div className="pointer-events-auto">
              <ContextualTourCallout
                id={id}
                anchorRef={anchorRef}
                preferredPlacement={placement}
                stepKey={`${progress.current}:${title}:${body}`}
                title={title}
                body={body}
                progress={progress}
                dismissLabel={closeLabel}
                onDismiss={() => setOpen(false)}
                actions={actions}
              >
                {children}
              </ContextualTourCallout>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
