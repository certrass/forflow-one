// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { setRendererUiLanguage } from '@/i18n/i18n'
import { CONTEXTUAL_TOURS } from '../../../../shared/contextual-tours'
import { localizeContextualTourStep } from './contextual-tour-localized-copy'
import {
  ContextualTourOverlaySurface,
  handleContextualTourOverlayKeyDown
} from './ContextualTourOverlaySurface'

afterEach(async () => {
  await setRendererUiLanguage('en')
})
it('renders every original tour step and its actions in Chinese', async () => {
  await setRendererUiLanguage('zh')
  let steps = 0
  for (const tour of CONTEXTUAL_TOURS) {
    for (const [index, original] of tour.steps.entries()) {
      const step = localizeContextualTourStep(original)
      expect(step.title).toMatch(/\p{Script=Han}/u)
      expect(step.body).toMatch(/\p{Script=Han}/u)
      for (const action of [step.primaryAction, step.secondaryAction]) {
        if (action) {
          expect(action.label).toMatch(/\p{Script=Han}/u)
        }
      }
      const html = renderToStaticMarkup(
        <ContextualTourOverlaySurface
          activeTourId={tour.id}
          renderState={{
            ...step,
            rect: new DOMRect(0, 0, 20, 20),
            targetElement: document.createElement('button'),
            progress: { current: index + 1, total: tour.steps.length },
            isFirstStep: index === 0,
            isLastStep: index === tour.steps.length - 1,
            panelHost: null
          }}
          panelRef={{ current: null }}
          panelHost={null}
          onSkip={vi.fn()}
          onBack={vi.fn()}
          onNext={vi.fn()}
          onStepAction={vi.fn()}
          onOverlayKeyDownCapture={handleContextualTourOverlayKeyDown}
        />
      )
      expect(html).toContain(step.title)
      expect(html).not.toContain('Start another task in parallel')
      expect(html).not.toContain('Each worktree gets its own branch')
      steps++
    }
  }
  expect(steps).toBe(18)
})
