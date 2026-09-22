// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import type { CodexReview } from '../../../../shared/codex-review-types'
import type {
  WorkspaceReviewQuery,
  WorkspaceReviewTarget
} from '../../../../shared/workspace-review-types'
import { review } from './review-workspace-fixtures'
import { WorkspaceReviewIntake } from './WorkspaceReviewIntake'

const originalApi = window.api
let rootPath = targetRoot()
function targetRoot() {
  return '/fixture/project'
}
const target: WorkspaceReviewTarget = {
  id: 'workspace-folder-1',
  selector: 'folder:one',
  kind: 'folder',
  hostId: 'local',
  name: 'Local fixture',
  rootPath: '/fixture/project',
  projectId: null,
  available: true,
  unavailableReason: null
}
const open = vi.fn<(query: WorkspaceReviewQuery) => Promise<CodexReview>>()
const analytics = vi.fn(async () => ({
  rows: [],
  total: 0,
  page: 1,
  pageSize: 10,
  projects: [],
  reviews: {}
}))
beforeEach(async () => {
  await i18n.changeLanguage('zh')
  open.mockReset().mockResolvedValue(review)
  rootPath = targetRoot()
  analytics.mockClear()
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      codexUsage: {
        listWorkspaceReviewTargets: async () => [
          { ...target, rootPath },
          { ...target, id: 'second', name: 'Second project', rootPath: '/fixture/second' },
          {
            ...target,
            id: 'remote',
            name: 'Remote fixture',
            available: false,
            hostId: 'ssh:fixture',
            unavailableReason: 'SSH evidence reader is not connected.'
          }
        ],
        listWorkspaceReviews: async () => [],
        listWorkspaceReviewFiles: async ({ workspaceId }: { workspaceId: string }) => ({
          directory: '',
          entries: (workspaceId === 'second'
            ? ['second.md']
            : ['code.ts', 'view.tsx', 'checks.log']
          ).map((path) => ({ path, name: path, kind: 'file' })),
          truncated: false
        }),
        getAnalytics: analytics,
        openWorkspaceReview: (query: WorkspaceReviewQuery) => open(query)
      }
    }
  })
})
afterEach(async () => {
  cleanup()
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
  await i18n.changeLanguage('en')
})
async function selectTarget(name: string) {
  const picker = screen.getByRole('combobox', { name: '项目' })
  await waitFor(() => expect(picker).not.toBeDisabled())
  fireEvent.click(picker)
  fireEvent.click(await screen.findByRole('option', { name: new RegExp(name) }))
}
async function selectFile(name: string) {
  fireEvent.click(await screen.findByRole('checkbox', { name }))
}
function setGoal() {
  fireEvent.change(screen.getByLabelText('检查目标'), {
    target: { value: '重启后问题的标题和状态保持不变' }
  })
}

it('opens a local review from checked files with no required policy or conversation and locks duplicate submits', async () => {
  let finish: ((value: CodexReview) => void) | undefined
  open.mockImplementation(
    () =>
      new Promise<CodexReview>((resolve) => {
        finish = resolve
      })
  )
  const onOpenReview = vi.fn()
  render(<WorkspaceReviewIntake active onOpenReview={onOpenReview} />)
  expect(screen.getByRole('button', { name: '进入审阅' })).toBeDisabled()
  expect(screen.getByText('检查制度或合规要求（可选）').closest('details')).not.toHaveAttribute(
    'open'
  )
  expect(analytics).not.toHaveBeenCalled()
  await selectTarget('Local fixture')
  setGoal()
  expect(screen.getByRole('button', { name: '进入审阅' })).toBeDisabled()
  await selectFile('code.ts')
  await selectFile('view.tsx')
  await selectFile('checks.log')
  expect(open).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '进入审阅' }))
  fireEvent.click(screen.getByRole('button', { name: '正在准备审阅材料…' }))
  expect(open).toHaveBeenCalledTimes(1)
  expect(open).toHaveBeenCalledWith({
    workspaceId: target.id,
    focus: '重启后问题的标题和状态保持不变',
    selection: {
      files: [
        { path: 'code.ts', kind: 'code' },
        { path: 'view.tsx', kind: 'code' },
        { path: 'checks.log', kind: 'verification' }
      ],
      sessionIds: [],
      policyReference: '',
      applicability: 'unconfirmed',
      applicabilityReason: ''
    }
  })
  finish?.(review)
  await waitFor(() => expect(onOpenReview).toHaveBeenCalledWith(review))
})

it('shows the execution-host limitation and cannot submit an unsupported project', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  await selectTarget('Remote fixture')
  expect(
    screen.getAllByText('SSH evidence reader is not connected.', { exact: true })
  ).not.toHaveLength(0)
  expect(screen.getByRole('button', { name: '进入审阅' })).toBeDisabled()
  expect(open).not.toHaveBeenCalled()
})

it('clears the previous project goal and files when choosing another project', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  await selectTarget('Local fixture')
  setGoal()
  await selectFile('code.ts')
  await selectTarget('Second project')
  expect(screen.getByLabelText('检查目标')).toHaveValue('')
  expect(screen.queryByRole('button', { name: '移除 code.ts' })).toBeNull()
  await selectFile('second.md')
  setGoal()
  fireEvent.click(screen.getByRole('button', { name: '进入审阅' }))
  await waitFor(() =>
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'second',
        selection: expect.objectContaining({ files: [{ path: 'second.md', kind: 'document' }] })
      })
    )
  )
})

it('does not pull the user into an old result after leaving and returning during preparation', async () => {
  let finish: ((value: CodexReview) => void) | undefined
  open.mockImplementation(
    () =>
      new Promise<CodexReview>((resolve) => {
        finish = resolve
      })
  )
  const onOpenReview = vi.fn()
  const view = render(<WorkspaceReviewIntake active onOpenReview={onOpenReview} />)
  await selectTarget('Local fixture')
  setGoal()
  await selectFile('code.ts')
  fireEvent.click(screen.getByRole('button', { name: '进入审阅' }))
  view.rerender(<WorkspaceReviewIntake active={false} onOpenReview={onOpenReview} />)
  view.rerender(<WorkspaceReviewIntake active onOpenReview={onOpenReview} />)
  finish?.(review)
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: '正在准备审阅材料…' })).toBeNull()
  )
  expect(onOpenReview).not.toHaveBeenCalled()
})

it('clears prior materials when the same project id moves to a different folder', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  await selectTarget('Local fixture')
  setGoal()
  await selectFile('code.ts')
  rootPath = '/fixture/relocated'
  fireEvent.click(screen.getByRole('button', { name: '刷新记录' }))
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('项目位置或执行环境已变化')
  )
  expect(screen.getByLabelText('检查目标')).toHaveValue('')
  expect(screen.queryByRole('button', { name: '移除 code.ts' })).toBeNull()
  expect(screen.getByRole('button', { name: '进入审阅' })).toBeDisabled()
  expect(open).not.toHaveBeenCalled()
})
