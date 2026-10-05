import type { CSSProperties, JSX, KeyboardEvent, RefObject } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import type {
  ContextualTourId,
  ContextualTourStepPlacement,
  ContextualTourStepControl,
  ContextualTourStepAction
} from '../../../../shared/contextual-tours'
import { ContextualTourControl } from './ContextualTourControl'
import { ContextualTourCallout } from './ContextualTourCallout'
import { translate } from '@/i18n/i18n'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const SKIP_BUTTON_SELECTOR = 'button[data-contextual-tour-dismiss]'

export type ActiveTourRenderState = {
  rect: DOMRect
  targetElement: Element
  progress: { current: number; total: number }
  title: string
  body: string
  control?: ContextualTourStepControl
  primaryAction?: ContextualTourStepAction
  secondaryAction?: ContextualTourStepAction
  preferredPlacement?: ContextualTourStepPlacement
  targetPulse?: boolean
  hidePrimaryAction?: boolean
  isLastStep: boolean
  isFirstStep: boolean
  panelHost: HTMLElement | null
}

type ContextualTourOverlaySurfaceProps = {
  activeTourId: ContextualTourId
  renderState: ActiveTourRenderState
  panelRef: RefObject<HTMLElement | null>
  panelHost: HTMLElement | null
  onSkip: (id: ContextualTourId) => void
  onBack: () => void
  onNext: () => void
  onStepAction: (action: ContextualTourStepAction) => void
  onOverlayKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void
}

function disposeContextualTourGlobalKeyGuard(): void {
  if (typeof window === 'undefined') {
    return
  }
  const guardedWindow = window as Window & {
    __orcaContextualTourGlobalKeyGuardInstalled?: boolean
  }
  if (!guardedWindow.__orcaContextualTourGlobalKeyGuardInstalled) {
    return
  }
  window.removeEventListener('keydown', handleContextualTourGlobalKeyDown, true)
  delete guardedWindow.__orcaContextualTourGlobalKeyGuardInstalled
}

if (typeof window !== 'undefined') {
  const guardedWindow = window as Window & {
    __orcaContextualTourGlobalKeyGuardInstalled?: boolean
  }
  if (!guardedWindow.__orcaContextualTourGlobalKeyGuardInstalled) {
    guardedWindow.__orcaContextualTourGlobalKeyGuardInstalled = true
    window.addEventListener('keydown', handleContextualTourGlobalKeyDown, true)
  }
}

if (import.meta !== undefined && import.meta.hot) {
  // Vite can replace this module without a full renderer reload. Remove the
  // global key guard so dev sessions do not retain stale module closures.
  import.meta.hot.dispose(disposeContextualTourGlobalKeyGuard)
}

export function ContextualTourOverlaySurface({
  activeTourId,
  renderState,
  panelRef,
  panelHost,
  onSkip,
  onBack,
  onNext,
  onStepAction,
  onOverlayKeyDownCapture
}: ContextualTourOverlaySurfaceProps): JSX.Element {
  const defaultPrimaryAction = {
    kind: renderState.isLastStep ? 'complete' : 'next',
    label: renderState.isLastStep
      ? translate('auto.components.contextual.tours.ContextualTourOverlaySurface.complete', 'Done')
      : translate(
          'auto.components.contextual.tours.contextual.tour.overlay.measurement.38b3155418',
          'Next'
        )
  } satisfies ContextualTourStepAction
  const primaryAction =
    renderState.primaryAction ?? (renderState.hidePrimaryAction ? null : defaultPrimaryAction)
  const showTargetRings = renderState.targetPulse === true
  const targetRingStyle = showTargetRings
    ? ({
        left: renderState.rect.left,
        top: renderState.rect.top,
        width: renderState.rect.width,
        height: renderState.rect.height
      } satisfies CSSProperties)
    : undefined
  return (
    <div
      className={cn('fixed inset-0 z-[70] pointer-events-none')}
      data-contextual-tour-overlay=""
      role="presentation"
      onKeyDownCapture={onOverlayKeyDownCapture}
    >
      {showTargetRings ? (
        <div
          aria-hidden="true"
          className="orca-contextual-tour-target-rings fixed z-[75]"
          data-contextual-tour-target-rings=""
          style={targetRingStyle}
        />
      ) : null}
      <div className="pointer-events-auto">
        <ContextualTourCallout
          tourPanel
          panelRef={panelRef}
          panelHost={panelHost}
          targetElement={renderState.targetElement}
          preferredPlacement={renderState.preferredPlacement}
          stepKey={`${activeTourId}-${renderState.progress.current}`}
          title={renderState.title}
          body={renderState.body}
          progress={renderState.progress}
          dismissLabel={
            renderState.isLastStep
              ? translate(
                  'auto.components.contextual.tours.ContextualTourOverlaySurface.d974f32a83',
                  'Dismiss tour'
                )
              : translate(
                  'auto.components.contextual.tours.ContextualTourOverlaySurface.4f86e2a10b',
                  'Skip tour'
                )
          }
          onDismiss={() => onSkip(activeTourId)}
          actions={
            <>
              {!renderState.isFirstStep ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={translate(
                    'auto.components.contextual.tours.ContextualTourOverlaySurface.4a9568f773',
                    'Back'
                  )}
                  onClick={onBack}
                >
                  <ArrowLeft />
                  {translate(
                    'auto.components.contextual.tours.ContextualTourOverlaySurface.4a9568f773',
                    'Back'
                  )}
                </Button>
              ) : null}
              {renderState.secondaryAction ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => onStepAction(renderState.secondaryAction!)}
                >
                  {renderState.secondaryAction.label}
                </Button>
              ) : null}
              {primaryAction ? (
                <Button
                  type="button"
                  size="xs"
                  onClick={
                    primaryAction.kind === defaultPrimaryAction.kind &&
                    primaryAction.label === defaultPrimaryAction.label
                      ? onNext
                      : () => onStepAction(primaryAction)
                  }
                >
                  {primaryAction.label}
                  {primaryAction.kind === 'next' && !renderState.isLastStep ? <ArrowRight /> : null}
                </Button>
              ) : null}
            </>
          }
        >
          {renderState.control ? <ContextualTourControl control={renderState.control} /> : null}
        </ContextualTourCallout>
      </div>
    </div>
  )
}

export function handleContextualTourOverlayKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    const skipButton = event.currentTarget.querySelector<HTMLButtonElement>(SKIP_BUTTON_SELECTOR)
    skipButton?.click()
  }

  // Why: tours are non-modal callouts over live UI. Keyboard users must be able
  // to tab into the highlighted surface just as pointer users can click it.
}

export function handleContextualTourGlobalKeyDown(event: globalThis.KeyboardEvent): void {
  const activeTourId = useAppStore.getState().activeContextualTourId
  if (!activeTourId || event.key !== 'Escape') {
    return
  }

  const overlay = document.querySelector<HTMLElement>('[data-contextual-tour-overlay]')
  const focusRoot = document.querySelector<HTMLElement>('[data-contextual-tour-panel]') ?? overlay
  if (!overlay || !focusRoot) {
    return
  }

  event.preventDefault()
  event.stopImmediatePropagation()
  const skipButton = focusRoot.querySelector<HTMLButtonElement>(SKIP_BUTTON_SELECTOR)
  if (skipButton) {
    skipButton.click()
  }
}

export function getContextualTourFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0 || element === document.activeElement
  )
}
