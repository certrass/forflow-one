// @vitest-environment happy-dom
import { useRef } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextualTourCallout } from './ContextualTourCallout'
import { watchContextualTourFloatingPosition } from './contextual-tour-floating-position'
import type * as TourFloating from './contextual-tour-floating-position'

vi.mock('./contextual-tour-floating-position', async (importOriginal) => {
  const actual = await importOriginal<typeof TourFloating>()
  return { ...actual, watchContextualTourFloatingPosition: vi.fn() }
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const copy = {
  stepKey: 'first',
  title: 'Pick a project',
  body: 'Choose the project below.',
  progress: { current: 1, total: 3 },
  dismissLabel: 'Close help',
  onDismiss: () => undefined
}

function CalloutBeforeItsTarget() {
  const anchorRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <ContextualTourCallout {...copy} anchorRef={anchorRef} />
      <input ref={anchorRef} aria-label="Project name" />
    </>
  )
}

it('positions against a ref attached by a later sibling and releases the observer on unmount', async () => {
  const stop = vi.fn()
  vi.mocked(watchContextualTourFloatingPosition).mockImplementation((args) => {
    args.onPosition({
      panelPlacement: 'right',
      panelPosition: { left: 100, top: 50 },
      arrowPosition: { top: 20 }
    })
    return stop
  })
  const view = render(<CalloutBeforeItsTarget />)
  await waitFor(() => expect(watchContextualTourFloatingPosition).toHaveBeenCalledTimes(1))
  expect(vi.mocked(watchContextualTourFloatingPosition).mock.calls[0][0].targetElement).toBe(
    screen.getByRole('textbox', { name: 'Project name' })
  )
  expect(screen.getByRole('dialog', { name: 'Pick a project' })).toBeVisible()
  view.unmount()
  expect(stop).toHaveBeenCalledTimes(1)
})

it('does not remeasure an existing tour target when only its copy or progress changes', () => {
  const target = document.createElement('button')
  vi.mocked(watchContextualTourFloatingPosition).mockReturnValue(vi.fn())
  const view = render(<ContextualTourCallout {...copy} targetElement={target} tourPanel />)
  expect(watchContextualTourFloatingPosition).toHaveBeenCalledTimes(1)
  view.rerender(
    <ContextualTourCallout
      {...copy}
      stepKey="second"
      body="Next instruction."
      progress={{ current: 2, total: 3 }}
      targetElement={target}
      tourPanel
    />
  )
  expect(watchContextualTourFloatingPosition).toHaveBeenCalledTimes(1)
})

it('cancels a deferred ref lookup when unmounted before the commit microtask', async () => {
  const view = render(<CalloutBeforeItsTarget />)
  view.unmount()
  await Promise.resolve()
  expect(watchContextualTourFloatingPosition).not.toHaveBeenCalled()
})
