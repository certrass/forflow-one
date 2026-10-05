import { createPortal } from 'react-dom'
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject
} from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ContextualTourStepPlacement } from '../../../../shared/contextual-tours'
import { ContextualTourArrow } from './ContextualTourArrow'
import { ContextualTourProgressDots } from './ContextualTourProgressDots'
import {
  watchContextualTourFloatingPosition,
  type ContextualTourFloatingPosition
} from './contextual-tour-floating-position'

type ContextualTourCalloutProps = {
  id?: string
  anchorRef?: RefObject<HTMLElement | null>
  targetElement?: Element
  panelRef?: RefObject<HTMLElement | null>
  panelHost?: HTMLElement | null
  preferredPlacement?: ContextualTourStepPlacement
  stepKey: string
  title: string
  body: string
  progress: { current: number; total: number }
  dismissLabel: string
  onDismiss: () => void
  children?: ReactNode
  actions?: ReactNode
  tourPanel?: boolean
}

const PANEL_BASE_CLASSES =
  'orca-contextual-tour-panel rounded-lg border border-border text-popover-foreground backdrop-blur-[2px]'
const PANEL_ANIMATION_CLASSES = 'animate-in fade-in-0 zoom-in-95 duration-200 ease-out'
const UNRESOLVED_POSITION = { left: 0, top: 0, visibility: 'hidden' } satisfies CSSProperties

export function ContextualTourCallout({
  id,
  anchorRef,
  targetElement,
  panelRef,
  panelHost = null,
  preferredPlacement,
  stepKey,
  title,
  body,
  progress,
  dismissLabel,
  onDismiss,
  children,
  actions,
  tourPanel = false
}: ContextualTourCalloutProps): React.JSX.Element {
  const generatedId = useId()
  const bodyId = `${id ?? generatedId}-body`
  const localPanelRef = useRef<HTMLElement | null>(null)
  const currentPanelRef = panelRef ?? localPanelRef
  const arrowRef = useRef<SVGSVGElement | null>(null)
  const [position, setPosition] = useState<ContextualTourFloatingPosition | null>(null)
  const hostedPanelClass = cn(
    PANEL_BASE_CLASSES,
    PANEL_ANIMATION_CLASSES,
    panelHost?.getAttribute('data-slot') === 'sheet-content'
      ? 'absolute z-[80] w-[min(20rem,calc(100%-1.5rem))]'
      : 'absolute z-[80] w-[min(20rem,calc(100%-2rem))]'
  )
  const floatingPanelClass = cn(
    PANEL_BASE_CLASSES,
    PANEL_ANIMATION_CLASSES,
    'fixed w-[min(20rem,calc(100vw-1.5rem))]'
  )
  const anchorStepKey = anchorRef ? stepKey : undefined
  useLayoutEffect(() => {
    const panel = currentPanelRef.current
    const arrow = arrowRef.current
    if (!panel || !arrow) {
      return
    }
    let active = true
    let stop: (() => void) | undefined
    const measure = (): void => {
      const target = targetElement ?? anchorRef?.current
      if (!active || !target) {
        return
      }
      setPosition(null)
      stop = watchContextualTourFloatingPosition({
        arrowElement: arrow,
        floatingElement: panel,
        panelHost,
        preferredPlacement,
        targetElement: target,
        onPosition: setPosition
      })
    }
    if (anchorRef) {
      // Sibling refs can attach after this component's layout effect in the same commit.
      queueMicrotask(measure)
    } else {
      measure()
    }
    return () => {
      active = false
      stop?.()
    }
  }, [anchorRef, anchorStepKey, currentPanelRef, panelHost, preferredPlacement, targetElement])

  const panel = (
    <section
      id={id}
      ref={currentPanelRef}
      aria-live="polite"
      aria-label={title}
      aria-describedby={bodyId}
      data-contextual-callout-panel=""
      data-contextual-tour-panel={tourPanel ? '' : undefined}
      data-placement={position?.panelPlacement}
      role="dialog"
      tabIndex={-1}
      className={panelHost ? hostedPanelClass : floatingPanelClass}
      style={position?.panelPosition ?? UNRESOLVED_POSITION}
    >
      <ContextualTourArrow
        arrowRef={arrowRef}
        placement={position?.panelPlacement ?? preferredPlacement ?? 'right'}
        style={position?.arrowPosition ?? { visibility: 'hidden' }}
      />
      <div key={stepKey} className="animate-in fade-in-0 duration-150 ease-out p-4">
        <Button
          type="button"
          data-contextual-tour-dismiss={tourPanel ? '' : undefined}
          variant="ghost"
          size="icon-xs"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="group absolute right-2 top-2"
        >
          <span className="text-muted-foreground group-hover:text-foreground">
            <X />
          </span>
        </Button>
        <h2 className="pr-6 text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        <p id={bodyId} className="mt-1.5 text-xs leading-5 text-muted-foreground">
          {body}
        </p>
        {children}
        <div className="mt-3.5 flex items-center justify-between gap-3">
          <ContextualTourProgressDots current={progress.current} total={progress.total} />
          <div className="flex items-center gap-1.5">{actions}</div>
        </div>
      </div>
    </section>
  )
  return panelHost ? createPortal(panel, panelHost) : panel
}
