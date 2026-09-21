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
beforeEach(async () => {
  await i18n.changeLanguage('zh')
  open.mockReset().mockResolvedValue(review)
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      codexUsage: {
        listWorkspaceReviewTargets: async () => [
          target,
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
        getAnalytics: async () => ({
          rows: [],
          total: 0,
          page: 1,
          pageSize: 10,
          projects: [],
          reviews: {}
        }),
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
  const picker = screen.getByRole('combobox', { name: '工作区' })
  await waitFor(() => expect(picker).not.toBeDisabled())
  fireEvent.click(picker)
  fireEvent.click(await screen.findByRole('option', { name: new RegExp(name) }))
}

it('saves only explicit paths, categories and goal through the workspace API and locks duplicate submits', async () => {
  let finish: ((value: CodexReview) => void) | undefined
  open.mockImplementation(
    () =>
      new Promise<CodexReview>((resolve) => {
        finish = resolve
      })
  )
  const onOpenReview = vi.fn()
  render(<WorkspaceReviewIntake active onOpenReview={onOpenReview} />)
  await selectTarget('Local fixture')
  fireEvent.change(screen.getByLabelText('目标与检查说明'), {
    target: { value: '验证恢复行为并保留原功能' }
  })
  fireEvent.change(screen.getByLabelText('代码'), {
    target: { value: ' src/task.ts\n\n src/view.tsx ' }
  })
  fireEvent.change(screen.getByLabelText('测试与构建回执'), { target: { value: 'proof/test.txt' } })
  fireEvent.click(screen.getByRole('button', { name: '保存本机审阅快照' }))
  fireEvent.click(screen.getByRole('button', { name: '正在读取指定证据…' }))
  expect(open).toHaveBeenCalledTimes(1)
  expect(open).toHaveBeenCalledWith({
    workspaceId: target.id,
    focus: '验证恢复行为并保留原功能',
    selection: {
      files: [
        { path: 'src/task.ts', kind: 'code' },
        { path: 'src/view.tsx', kind: 'code' },
        { path: 'proof/test.txt', kind: 'verification' }
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

it('shows the execution-host limitation and cannot submit an unsupported workspace', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  await selectTarget('Remote fixture')
  expect(screen.getByText('SSH evidence reader is not connected.', { exact: true })).toBeVisible()
  expect(screen.getByRole('button', { name: '保存本机审阅快照' })).toBeDisabled()
  expect(open).not.toHaveBeenCalled()
})

it('rejects duplicate file paths across categories without reading the workspace', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  await selectTarget('Local fixture')
  fireEvent.change(screen.getByLabelText('目标与检查说明'), { target: { value: '审阅选定文件' } })
  fireEvent.change(screen.getByLabelText('代码'), { target: { value: 'src/task.ts' } })
  fireEvent.change(screen.getByLabelText('文档与需求'), { target: { value: 'src/task.ts' } })
  fireEvent.click(screen.getByRole('button', { name: '保存本机审阅快照' }))
  expect(screen.getByRole('alert')).toHaveTextContent('每个文件路径只需出现一次')
  expect(open).not.toHaveBeenCalled()
})

it('does not pull the user back into Review after they leave during a local snapshot read', async () => {
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
  fireEvent.change(screen.getByLabelText('目标与检查说明'), { target: { value: '审阅选定文件' } })
  fireEvent.change(screen.getByLabelText('代码'), { target: { value: 'src/task.ts' } })
  fireEvent.click(screen.getByRole('button', { name: '保存本机审阅快照' }))
  view.rerender(<WorkspaceReviewIntake active={false} onOpenReview={onOpenReview} />)
  finish?.(review)
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: '正在读取指定证据…' })).toBeNull()
  )
  expect(onOpenReview).not.toHaveBeenCalled()
})
