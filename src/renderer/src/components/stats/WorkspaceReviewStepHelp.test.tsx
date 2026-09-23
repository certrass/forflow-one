// @vitest-environment happy-dom
import { useRef } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { WorkspaceReviewStepHelp } from './WorkspaceReviewStepHelp'
import type * as TourFloating from '../contextual-tours/contextual-tour-floating-position'

vi.mock('../contextual-tours/contextual-tour-floating-position', async (importOriginal) => {
  const actual = await importOriginal<typeof TourFloating>()
  return {
    ...actual,
    watchContextualTourFloatingPosition: (
      args: Parameters<typeof actual.watchContextualTourFloatingPosition>[0]
    ) => {
      args.onPosition({
        panelPlacement: 'right',
        panelPosition: { left: 100, top: 50 },
        arrowPosition: { top: 20 }
      })
      return () => undefined
    }
  }
})

const originalTour = useAppStore.getState().activeContextualTourId
beforeEach(() => useAppStore.setState({ activeContextualTourId: null }))
afterEach(() => {
  cleanup()
  useAppStore.setState({ activeContextualTourId: originalTour })
})

function Fixture({ active = true }: { active?: boolean }) {
  const anchorRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input ref={anchorRef} aria-label="Review goal" />
      <WorkspaceReviewStepHelp
        active={active}
        anchorRef={anchorRef}
        title="Choose material"
        body="Select the project and material to inspect."
        label="Show guidance"
        closeLabel="Close guidance"
        progress={{ current: 1, total: 3 }}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button>Choose project</Button>
        </PopoverTrigger>
        <PopoverContent>
          <button type="button">Project One</button>
        </PopoverContent>
      </Popover>
      <Select defaultValue="document">
        <SelectTrigger aria-label="File purpose">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="document">Document</SelectItem>
        </SelectContent>
      </Select>
    </>
  )
}

it.each(['project', 'purpose'])(
  'lets the real %s menu consume Escape before closing the callout',
  async (kind) => {
    render(<Fixture />)
    await screen.findByRole('dialog', { name: 'Choose material' })
    fireEvent.click(
      kind === 'project'
        ? screen.getByRole('button', { name: 'Choose project' })
        : screen.getByRole('combobox', { name: 'File purpose' })
    )
    const item =
      kind === 'project'
        ? await screen.findByRole('button', { name: 'Project One' })
        : await screen.findByRole('option', { name: 'Document' })
    fireEvent.keyDown(item, { key: 'Escape' })
    await waitFor(() => expect(item).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'Choose material' })).toBeVisible()
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  }
)

it('keeps guidance visible while typing and allows explicit dismissal and replay without moving focus', async () => {
  render(<Fixture />)
  await screen.findByRole('dialog', { name: 'Choose material' })
  const input = screen.getByRole('textbox')
  input.focus()
  fireEvent.change(input, { target: { value: 'Keep this goal' } })
  expect(input).toHaveFocus()
  expect(screen.getByRole('dialog', { name: 'Choose material' })).toBeVisible()
  fireEvent.keyDown(input, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(input).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: 'Show guidance' }))
  expect(await screen.findByRole('dialog', { name: 'Choose material' })).toBeVisible()
})

it('pauses its portal and Escape listener while inactive without forgetting dismissal', async () => {
  const view = render(<Fixture />)
  await screen.findByRole('dialog', { name: 'Choose material' })
  fireEvent.click(screen.getByRole('button', { name: 'Close guidance' }))
  view.rerender(<Fixture active={false} />)
  const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  screen.getByRole('textbox').dispatchEvent(escape)
  expect(escape.defaultPrevented).toBe(false)
  view.rerender(<Fixture />)
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Show guidance' }))
  await screen.findByRole('dialog', { name: 'Choose material' })
  view.rerender(<Fixture active={false} />)
  expect(screen.queryByRole('dialog')).toBeNull()
  view.rerender(<Fixture />)
  expect(await screen.findByRole('dialog', { name: 'Choose material' })).toBeVisible()
})

it('yields to a global tour and resumes only its own open state afterward', async () => {
  render(<Fixture />)
  await screen.findByRole('dialog', { name: 'Choose material' })
  act(() => useAppStore.setState({ activeContextualTourId: 'browser' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  act(() => useAppStore.setState({ activeContextualTourId: null }))
  expect(await screen.findByRole('dialog', { name: 'Choose material' })).toBeVisible()
})
