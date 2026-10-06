// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import type { CodexReview } from '../../../../shared/codex-review-types'
import type { WorkspaceReviewSnapshot } from '../../../../shared/workspace-review-types'
import { review } from './review-workspace-fixtures'
import { CodexReviewWorkspace } from './CodexReviewWorkspace'
import { StatsPane } from './StatsPane'

vi.mock('./StatsOverviewTab', () => ({ StatsOverviewTab: () => <p>Overview content</p> }))
vi.mock('./CodexAnalyticsPanel', () => ({
  CodexAnalyticsPanel: ({
    active,
    onOpenReview
  }: {
    active: boolean
    onOpenReview: (value: CodexReview) => void
  }) =>
    active ? (
      <button type="button" onClick={() => onOpenReview(workspaceReview)}>
        Open fixture review
      </button>
    ) : null
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
    sessionIds: [],
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

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    return new DOMRect(
      0,
      0,
      this === document.documentElement ? 1280 : 320,
      this === document.documentElement ? 800 : 80
    )
  })
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1280)
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800)
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      codexUsage: {
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
async function openReview(): Promise<void> {
  render(<StatsPane />)
  switchTab('Analytics')
  fireEvent.click(screen.getByRole('button', { name: 'Open fixture review' }))
  await screen.findByRole('dialog', { name: 'Start with the source material' })
}

it('pauses a saved review guide outside Review and preserves dismissal when returning', async () => {
  await openReview()
  switchTab('Overview')
  expect(document.querySelector('[data-workspace-review-step-help]')).toBeNull()
  const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  window.dispatchEvent(escape)
  expect(escape.defaultPrevented).toBe(false)
  switchTab('Review')
  expect(
    await screen.findByRole('dialog', { name: 'Start with the source material' })
  ).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Hide guidance' }))
  switchTab('Analytics')
  switchTab('Review')
  expect(document.querySelector('[data-workspace-review-step-help]')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Walk me through this review' }))
  expect(
    await screen.findByRole('dialog', { name: 'Start with the source material' })
  ).toBeVisible()
})

it('passes Review visibility through the saved-material editor without resetting dismissal', async () => {
  await openReview()
  fireEvent.click(screen.getByRole('button', { name: 'Change materials' }))
  expect(await screen.findByRole('checkbox', { name: 'README.md' })).toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: 'Step help' }))
  expect(await screen.findByRole('dialog', { name: 'Ready to continue' })).toBeVisible()
  switchTab('Analytics')
  expect(document.querySelector('[data-workspace-review-step-help]')).toBeNull()
  switchTab('Review')
  expect(await screen.findByRole('dialog', { name: 'Ready to continue' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Close this tip' }))
  switchTab('Overview')
  switchTab('Review')
  expect(document.querySelector('[data-workspace-review-step-help]')).toBeNull()
})

it('keeps direct workspace review callers active by default', async () => {
  render(<CodexReviewWorkspace initial={workspaceReview} onBack={vi.fn()} />)
  expect(
    await screen.findByRole('dialog', { name: 'Start with the source material' })
  ).toBeVisible()
})
