// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { setRendererUiLanguage } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { ContextualTourOverlay } from './ContextualTourOverlay'

// Locale events must refresh cached copy without waiting for a visible-window poll.
vi.mock('@/lib/window-visibility-interval', () => ({
  installWindowVisibilityInterval: () => () => {}
}))

let container: HTMLDivElement
let target: HTMLDivElement
let root: Root

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { ui: { set: () => Promise.resolve() } }
  })
  await setRendererUiLanguage('en')
  container = document.createElement('div')
  target = document.createElement('div')
  target.setAttribute('data-contextual-tour-target', 'terminal-pane-split-target')
  target.getBoundingClientRect = () => new DOMRect(100, 100, 120, 40)
  document.body.append(container, target)
  root = createRoot(container)
  useAppStore.setState({
    activeContextualTourId: 'workspace-agent-sessions',
    activeContextualTourStepIndex: 0,
    activeModal: 'none',
    contextualToursOnboardingVisible: false,
    contextualToursBlockingSurfaceVisible: false,
    activeContextualTourSuppressed: false
  })
})

afterEach(async () => {
  act(() => root.unmount())
  container.remove()
  target.remove()
  useAppStore.setState({ activeContextualTourId: null, activeContextualTourStepIndex: 0 })
  await setRendererUiLanguage('en')
  vi.unstubAllGlobals()
})

it('refreshes an open tour title, body and action when language changes', async () => {
  await act(async () => root.render(<ContextualTourOverlay />))
  expect(container.querySelector('h2')?.textContent).toBe('Split a terminal pane')
  await act(async () => {
    await setRendererUiLanguage('zh')
  })
  expect(container.querySelector('h2')?.textContent).toMatch(/\p{Script=Han}/u)
  expect(container.querySelector('p')?.textContent).toMatch(/\p{Script=Han}/u)
  expect(container.textContent).not.toContain('Split terminal')
  expect(container.querySelector('button:last-child')?.textContent).toMatch(/\p{Script=Han}/u)
})

it('dismisses an initially Chinese tour with Escape', async () => {
  await setRendererUiLanguage('zh')
  await act(async () => root.render(<ContextualTourOverlay />))
  expect(container.querySelector('[data-contextual-tour-panel]')).not.toBeNull()
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  expect(useAppStore.getState().activeContextualTourId).toBeNull()
})
