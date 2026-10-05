// @vitest-environment happy-dom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import {
  WorkspaceReviewWalkthrough,
  useReviewWalkthroughAnchors
} from './WorkspaceReviewWalkthrough'

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      return new DOMRect(
        0,
        0,
        this === document.documentElement ? 1280 : 320,
        this === document.documentElement ? 800 : 80
      )
    }
  )
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1280)
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Harness({
  initialTab = 'overview',
  disabled = false,
  readOnly = false,
  hasJev = true,
  singleRecord = false,
  navigate = vi.fn()
}: {
  initialTab?: string
  disabled?: boolean
  readOnly?: boolean
  hasJev?: boolean
  singleRecord?: boolean
  navigate?: (tab: string) => void
}) {
  const [tab, setTab] = useState(initialTab)
  const anchors = useReviewWalkthroughAnchors()
  return (
    <>
      <nav>
        {Object.entries(anchors).map(([key, ref]) => (
          <button key={key} ref={ref} type="button" onClick={() => setTab(key)}>
            {key}
          </button>
        ))}
      </nav>
      <WorkspaceReviewWalkthrough
        tab={tab}
        anchors={anchors}
        disabled={disabled}
        readOnly={readOnly}
        hasJev={hasJev}
        singleRecord={singleRecord}
        onTab={(next) => {
          navigate(next)
          setTab(next)
        }}
      />
    </>
  )
}

it('guides source reading, issue entry and Jev preview through explicit navigation', async () => {
  const navigate = vi.fn()
  render(<Harness navigate={navigate} />)
  expect(
    await screen.findByRole('dialog', { name: 'Start with the source material' })
  ).toBeVisible()
  expect(navigate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Open source records' }))
  expect(
    await screen.findByRole('dialog', { name: 'Read a source, then mark a gap' })
  ).toBeVisible()
  expect(screen.getByText(/click Read source locally/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Open issue list' }))
  expect(
    await screen.findByRole('dialog', { name: 'Save a specific, traceable issue' })
  ).toBeVisible()
  expect(screen.getByText(/Click Add issue to save it/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Open Jev (optional)' }))
  expect(await screen.findByRole('dialog', { name: 'Choose what Jev will receive' })).toBeVisible()
  expect(screen.getByText(/up to 40 files.*1–12 sources/)).toBeVisible()
  expect(screen.getByText(/Sending requires your separate click/)).toBeVisible()
  expect(navigate.mock.calls).toEqual([['records'], ['issues'], ['jev']])
  expect(screen.queryByRole('button', { name: 'Send this preview to Jev' })).toBeNull()
})

it('keeps dismissed guidance closed across tabs until the user reopens it', async () => {
  render(<Harness />)
  await screen.findByRole('dialog', { name: 'Start with the source material' })
  fireEvent.click(screen.getByRole('button', { name: 'Hide guidance' }))
  fireEvent.click(screen.getByRole('button', { name: 'records' }))
  await waitFor(() => expect(screen.queryByText('Read a source, then mark a gap')).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'Walk me through this review' }))
  expect(
    await screen.findByRole('dialog', { name: 'Read a source, then mark a gap' })
  ).toBeVisible()
})

it('does not offer mutation steps for a historical version or a missing Jev capability', async () => {
  const rendered = render(<Harness initialTab="records" readOnly />)
  expect(await screen.findByRole('dialog', { name: 'Inspect a saved version' })).toBeVisible()
  expect(screen.getByText(/Choose the latest version/)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Compare saved versions' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Open issue list' })).toBeNull()
  rendered.unmount()
  render(<Harness initialTab="issues" hasJev={false} />)
  expect(
    await screen.findByRole('dialog', { name: 'Save a specific, traceable issue' })
  ).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Open Jev (optional)' })).toBeNull()
})

it('explains a single record entry and holds navigation while the review is busy', async () => {
  const navigate = vi.fn()
  const rendered = render(<Harness initialTab="jev" singleRecord disabled navigate={navigate} />)
  await screen.findByRole('dialog', { name: 'Choose what Jev will receive' })
  expect(screen.getByText(/This entry checks a single record/)).toBeVisible()
  const next = screen.getByRole('button', { name: 'Open issue list' })
  expect(next).toBeDisabled()
  fireEvent.click(next)
  expect(navigate).not.toHaveBeenCalled()
  rendered.unmount()
  render(<Harness initialTab="changes" />)
  expect(
    await screen.findByRole('dialog', { name: 'Reread after a change, then compare' })
  ).toBeVisible()
  expect(screen.getByText(/first version has nothing to compare/)).toBeVisible()
})
