// @vitest-environment happy-dom
import { useState, type ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import type { CodexReview } from '../../../../shared/codex-review-types'
import type {
  WorkspaceReviewQuery,
  WorkspaceReviewSnapshot
} from '../../../../shared/workspace-review-types'
import type { JevAuditPanel } from './JevAuditPanel'
import { CodexReviewWorkspace } from './CodexReviewWorkspace'
import { review } from './review-workspace-fixtures'

vi.mock('./JevAuditPanel', () => ({
  JevAuditPanel: function JevFixture(props: ComponentProps<typeof JevAuditPanel>) {
    const [draft, setDraft] = useState('')
    return (
      <section hidden={!props.active} data-testid="jev-fixture" data-read-only={props.readOnly}>
        {props.active && <div role="dialog" aria-label="Jev fixture guidance" />}
        <p>{props.initialEvidenceKey ?? 'Delivery draft'}</p>
        <label>
          Selected evidence draft
          <input value={draft} onChange={(event) => setDraft(event.target.value)} />
        </label>
        <button type="button" onClick={() => props.onLocate?.('readme')}>
          Locate selected evidence
        </button>
        <button type="button" onClick={props.onEditGoal}>
          Edit the saved goal
        </button>
        {props.onEditSources && (
          <button type="button" onClick={props.onEditSources}>
            Add source files
          </button>
        )}
        <button type="button" onClick={props.onReread}>
          Reread the selected sources
        </button>
        <button type="button" onClick={props.onIssues}>
          Inspect issues
        </button>
        <button type="button" onClick={() => props.onBusyChange?.(true)}>
          Start in-flight check
        </button>
        <button type="button" onClick={() => props.onBusyChange?.(false)}>
          Finish in-flight check
        </button>
      </section>
    )
  }
}))

const workspace: WorkspaceReviewSnapshot = {
  target: {
    id: 'workspace',
    selector: 'folder:one',
    kind: 'folder',
    hostId: 'local',
    name: 'Fixture project',
    rootPath: '/fixture',
    projectId: null,
    available: true,
    unavailableReason: null
  },
  rootIdentity: 'fixture-root',
  selection: {
    files: [{ path: 'README.md', kind: 'document' }],
    sessionIds: ['session'],
    policyReference: '',
    applicability: 'unconfirmed',
    applicabilityReason: ''
  },
  files: [
    {
      path: 'README.md',
      kind: 'document',
      evidenceKey: 'readme',
      status: 'read',
      contentHash: 'hash',
      size: 10,
      mtimeMs: 1,
      reason: null,
      signals: []
    }
  ],
  git: { status: 'not_applicable', head: null, branch: null, changes: [], reason: null },
  ruleVersion: 'workspace-evidence-v1',
  partial: false,
  gaps: []
}
const workspaceReview: CodexReview = {
  ...review,
  sessionId: null,
  versions: [{ ...review.versions[0], usage: null, workspace }]
}
const originalApi = window.api
const openWorkspace = vi.fn<(input: WorkspaceReviewQuery) => Promise<CodexReview>>()
const openConversation = vi.fn()

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})
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
  openWorkspace.mockReset().mockImplementation(async (input) => ({
    ...workspaceReview,
    revision: 1,
    versions: [
      ...workspaceReview.versions,
      { ...workspaceReview.versions[0], id: 'new-version', focus: input.focus }
    ]
  }))
  openConversation.mockReset().mockResolvedValue(review)
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      forflowJevAudit: { list: async () => [] },
      codexUsage: {
        openWorkspaceReview: openWorkspace,
        openReview: openConversation,
        listWorkspaceReviewTargets: async () => [workspace.target],
        listWorkspaceReviews: async () => [workspaceReview],
        listWorkspaceReviewFiles: async () => ({
          directory: '',
          truncated: false,
          entries: [{ name: 'README.md', path: 'README.md', kind: 'file' }]
        })
      }
    }
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
})

function switchTab(name: string): void {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false })
}

it('keeps both delivery and single-record drafts when locating the source and returning', async () => {
  render(<CodexReviewWorkspace initial={workspaceReview} onBack={vi.fn()} />)
  switchTab('Jev · Beta')
  fireEvent.change(screen.getByLabelText('Selected evidence draft'), {
    target: { value: 'readme' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Locate selected evidence' }))
  expect(screen.getByTestId('workspace-review-records')).toBeVisible()
  switchTab('Jev · Beta')
  expect(screen.getByLabelText('Selected evidence draft')).toHaveValue('readme')
  switchTab('Records')
  fireEvent.click(
    within(screen.getByTestId('workspace-review-records')).getByRole('button', {
      name: 'Review this record'
    })
  )
  expect(screen.getByText('readme', { exact: true })).toBeVisible()
  fireEvent.change(screen.getByLabelText('Selected evidence draft'), {
    target: { value: 'record claim' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Locate selected evidence' }))
  switchTab('Jev · Beta')
  expect(screen.getByText('readme', { exact: true })).toBeVisible()
  expect(screen.getByLabelText('Selected evidence draft')).toHaveValue('record claim')
})

it('activates one guide per page and pauses both guides when Review is hidden', async () => {
  const view = render(<CodexReviewWorkspace initial={workspaceReview} onBack={vi.fn()} />)
  expect(
    await screen.findByRole('dialog', { name: 'Start with the source material' })
  ).toBeVisible()
  switchTab('Jev · Beta')
  expect(screen.queryByRole('dialog', { name: 'Choose what Jev will receive' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Walk me through this review' })).toBeNull()
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
  expect(screen.getByRole('dialog', { name: 'Jev fixture guidance' })).toBeVisible()
  view.rerender(<CodexReviewWorkspace active={false} initial={workspaceReview} onBack={vi.fn()} />)
  expect(screen.queryAllByRole('dialog')).toHaveLength(0)
  view.rerender(<CodexReviewWorkspace active initial={workspaceReview} onBack={vi.fn()} />)
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
})

it('opens the actual goal editor and saves it in a new snapshot without replacing its material selection', async () => {
  render(<CodexReviewWorkspace initial={workspaceReview} onBack={vi.fn()} />)
  expect(screen.getByLabelText('Review focus').closest('details')).not.toHaveAttribute('open')
  switchTab('Jev · Beta')
  fireEvent.change(screen.getByLabelText('Selected evidence draft'), {
    target: { value: 'readme' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Edit the saved goal' }))
  const input = screen.getByLabelText('Review focus')
  expect(input.closest('details')).toHaveAttribute('open')
  expect(input).toHaveFocus()
  expect(input.scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
  fireEvent.change(input, { target: { value: 'A saved review survives restarting the app.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save goal and reread current records' }))
  await waitFor(() =>
    expect(openWorkspace).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.target.id,
      selection: workspace.selection,
      focus: 'A saved review survives restarting the app.',
      expectedRevision: workspaceReview.revision
    })
  )
  switchTab('Jev · Beta')
  expect(screen.getByLabelText('Selected evidence draft')).toHaveValue('')
})

it('opens the existing file editor and preserves the Jev draft if editing is cancelled', async () => {
  render(<CodexReviewWorkspace initial={workspaceReview} onBack={vi.fn()} />)
  switchTab('Jev · Beta')
  fireEvent.change(screen.getByLabelText('Selected evidence draft'), {
    target: { value: 'readme' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add source files' }))
  expect(await screen.findByRole('checkbox', { name: 'README.md' })).toBeChecked()
  expect(screen.getByTestId('codex-review')).not.toBeVisible()
  expect(screen.queryByRole('dialog', { name: 'Jev fixture guidance' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByLabelText('Selected evidence draft')).toHaveValue('readme')
  expect(openWorkspace).not.toHaveBeenCalled()
})

it('rereads a conversation with its saved scope and opens an empty issue list', async () => {
  render(<CodexReviewWorkspace initial={review} onBack={vi.fn()} />)
  switchTab('Jev · Beta')
  expect(screen.queryByRole('button', { name: 'Add source files' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Reread the selected sources' }))
  await waitFor(() =>
    expect(openConversation).toHaveBeenCalledExactlyOnceWith({
      sessionId: review.sessionId,
      scope: review.scope,
      range: review.range,
      focus: review.versions[0].focus,
      expectedRevision: review.revision
    })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Inspect issues' }))
  expect(screen.getByLabelText('Issue title')).toBeVisible()
})

it('resets a draft when selecting a historical version and keeps its actions read-only', async () => {
  const current: CodexReview = {
    ...workspaceReview,
    versions: [
      ...workspaceReview.versions,
      { ...workspaceReview.versions[0], id: 'latest-version', createdAt: 2 }
    ]
  }
  render(<CodexReviewWorkspace initial={current} onBack={vi.fn()} />)
  switchTab('Jev · Beta')
  fireEvent.change(screen.getByLabelText('Selected evidence draft'), {
    target: { value: 'readme' }
  })
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Version' }), { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('option', { name: /^v1/ }))
  expect(screen.getByTestId('jev-fixture')).toHaveAttribute('data-read-only', 'true')
  expect(screen.getByLabelText('Selected evidence draft')).toHaveValue('')
  expect(screen.queryByRole('button', { name: 'Add source files' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Edit the saved goal' }))
  fireEvent.click(screen.getByRole('button', { name: 'Reread the selected sources' }))
  expect(screen.getByRole('tab', { name: 'Jev · Beta' })).toHaveAttribute('data-state', 'active')
  expect(openWorkspace).not.toHaveBeenCalled()
})

it('keeps all header navigation and mutations locked while a Jev request is in flight', async () => {
  render(<CodexReviewWorkspace initial={workspaceReview} onBack={vi.fn()} />)
  switchTab('Jev · Beta')
  fireEvent.click(screen.getByRole('button', { name: 'Start in-flight check' }))
  const header = document.querySelector('header')
  expect(header).not.toBeNull()
  if (!header) {
    throw new Error('Review header is missing')
  }
  for (const button of within(header).getAllByRole('button')) {
    expect(button).toBeDisabled()
  }
  expect(screen.getByRole('combobox', { name: 'Version' })).toBeDisabled()
  for (const tab of screen.getAllByRole('tab')) {
    expect(tab).toBeDisabled()
  }
  fireEvent.click(screen.getByRole('button', { name: 'Edit the saved goal' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add source files' }))
  fireEvent.click(screen.getByRole('button', { name: 'Reread the selected sources' }))
  fireEvent.click(screen.getByRole('button', { name: 'Locate selected evidence' }))
  fireEvent.click(screen.getByRole('button', { name: 'Inspect issues' }))
  expect(screen.getByRole('tab', { name: 'Jev · Beta' })).toHaveAttribute('data-state', 'active')
  expect(screen.queryByTestId('workspace-review-intake')).toBeNull()
  expect(openWorkspace).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Finish in-flight check' }))
  expect(screen.getByRole('combobox', { name: 'Version' })).toBeEnabled()
})
