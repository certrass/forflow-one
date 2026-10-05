// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import type { CodexReview } from '../../../../shared/codex-review-types'
import type {
  WorkspaceReviewQuery,
  WorkspaceReviewSnapshot,
  WorkspaceReviewTarget
} from '../../../../shared/workspace-review-types'
import { review } from './review-workspace-fixtures'
import { WorkspaceReviewIntake } from './WorkspaceReviewIntake'

const originalApi = window.api
const target: WorkspaceReviewTarget = {
  id: 'workspace-one',
  selector: 'folder:one',
  kind: 'folder',
  hostId: 'local',
  name: 'Saved project',
  rootPath: '/fixture/project',
  projectId: null,
  available: true,
  unavailableReason: null
}
const workspace: WorkspaceReviewSnapshot = {
  target,
  rootIdentity: 'fixture-root',
  selection: {
    files: [{ path: 'README.md', kind: 'document' }],
    sessionIds: ['selected-session'],
    policyReference: '交付制度 v2',
    applicability: 'applies',
    applicabilityReason: '现行交付要求'
  },
  files: [
    {
      path: 'README.md',
      kind: 'document',
      evidenceKey: 'readme',
      status: 'read',
      contentHash: 'saved-hash',
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
const initial: CodexReview = {
  ...review,
  sessionId: null,
  revision: 3,
  versions: [
    { ...review.versions[0], focus: '运行说明应包含步骤与预期结果', usage: null, workspace }
  ]
}

beforeEach(async () => {
  await i18n.changeLanguage('zh')
})
afterEach(async () => {
  cleanup()
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
  await i18n.changeLanguage('en')
})

it('opens an existing review at its materials after asynchronous project hydration without losing saved inputs', async () => {
  let resolveTargets: ((targets: WorkspaceReviewTarget[]) => void) | undefined
  const targetsReady = new Promise<WorkspaceReviewTarget[]>((resolve) => {
    resolveTargets = resolve
  })
  const open = vi
    .fn<(query: WorkspaceReviewQuery) => Promise<CodexReview>>()
    .mockResolvedValue(initial)
  const analytics = vi.fn()
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      codexUsage: {
        listWorkspaceReviewTargets: () => targetsReady,
        listWorkspaceReviews: async () => [initial],
        listWorkspaceReviewFiles: async () => ({
          directory: '',
          truncated: false,
          entries: [{ path: 'README.md', name: 'README.md', kind: 'file' }]
        }),
        getAnalytics: analytics,
        openWorkspaceReview: open
      }
    }
  })
  const onOpenReview = vi.fn()
  render(<WorkspaceReviewIntake active initial={initial} onOpenReview={onOpenReview} />)
  await act(async () => {
    resolveTargets?.([target])
  })
  expect(await screen.findByRole('checkbox', { name: 'README.md' })).toBeChecked()
  expect(screen.queryByRole('combobox', { name: '项目' })).toBeNull()
  expect(screen.getByText('检查目标：运行说明应包含步骤与预期结果')).toBeVisible()
  expect(screen.getByRole('combobox', { name: '文件用途: README.md' })).toHaveTextContent(
    '需求与说明'
  )
  expect(screen.getByRole('button', { name: '更新审阅材料' })).not.toBeDisabled()
  expect(analytics).not.toHaveBeenCalled()
  expect(open).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '上一步' }))
  expect(screen.getByLabelText('检查目标')).toHaveValue('运行说明应包含步骤与预期结果')
  fireEvent.click(screen.getByRole('button', { name: '继续：选择材料' }))
  expect(await screen.findByRole('checkbox', { name: 'README.md' })).toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: '更新审阅材料' }))
  await waitFor(() => expect(onOpenReview).toHaveBeenCalledWith(initial))
  expect(open).toHaveBeenCalledExactlyOnceWith({
    workspaceId: target.id,
    focus: initial.versions[0].focus,
    selection: workspace.selection,
    expectedRevision: initial.revision
  })
})
