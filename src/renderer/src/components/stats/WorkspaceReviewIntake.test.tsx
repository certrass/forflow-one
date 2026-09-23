// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
let rootPath = '/fixture/project'
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
const listFiles = vi.fn(async ({ workspaceId }: { workspaceId: string }) => ({
  directory: '',
  entries: (workspaceId === 'second' ? ['second.md'] : ['code.ts', 'view.tsx', 'checks.log']).map(
    (path) => ({ path, name: path, kind: 'file' })
  ),
  truncated: false
}))
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
  rootPath = '/fixture/project'
  listFiles.mockClear()
  analytics.mockClear()
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
        listWorkspaceReviewFiles: listFiles,
        getAnalytics: analytics,
        openWorkspaceReview: (query: WorkspaceReviewQuery) => open(query)
      }
    }
  })
})
afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
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
function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}
async function prepareMaterials() {
  await selectTarget('Local fixture')
  click('继续：确定检查目标')
  setGoal()
  click('继续：选择材料')
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
  expect(screen.getByRole('button', { name: '继续：确定检查目标' })).toBeDisabled()
  expect(analytics).not.toHaveBeenCalled()
  await prepareMaterials()
  expect(screen.getByText('补充对话或制度要求（可选）').closest('details')).not.toHaveAttribute(
    'open'
  )
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
  await act(async () => finish?.(review))
  await waitFor(() => expect(onOpenReview).toHaveBeenCalledWith(review))
})

it('shows the execution-host limitation and cannot submit an unsupported project', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  await selectTarget('Remote fixture')
  expect(
    screen.getAllByText('SSH evidence reader is not connected.', { exact: true })
  ).not.toHaveLength(0)
  expect(screen.getByRole('button', { name: '继续：确定检查目标' })).toBeDisabled()
  expect(listFiles).not.toHaveBeenCalled()
  expect(open).not.toHaveBeenCalled()
})

it('clears the previous project goal and files when choosing another project', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  await prepareMaterials()
  await selectFile('code.ts')
  click('上一步')
  click('上一步')
  await selectTarget('Second project')
  click('继续：确定检查目标')
  expect(screen.getByLabelText('检查目标')).toHaveValue('')
  setGoal()
  click('继续：选择材料')
  expect(screen.queryByRole('button', { name: '移除 code.ts' })).toBeNull()
  await selectFile('second.md')
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
  await prepareMaterials()
  await selectFile('code.ts')
  fireEvent.click(screen.getByRole('button', { name: '进入审阅' }))
  view.rerender(<WorkspaceReviewIntake active={false} onOpenReview={onOpenReview} />)
  view.rerender(<WorkspaceReviewIntake active onOpenReview={onOpenReview} />)
  await act(async () => finish?.(review))
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: '正在准备审阅材料…' })).toBeNull()
  )
  expect(onOpenReview).not.toHaveBeenCalled()
})

it('clears prior materials when the same project id moves to a different folder', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  await prepareMaterials()
  await selectFile('code.ts')
  rootPath = '/fixture/relocated'
  fireEvent.click(screen.getByRole('button', { name: '刷新记录' }))
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('项目位置或执行环境已变化')
  )
  expect(screen.getByRole('combobox', { name: '项目' })).toHaveTextContent('Local fixture')
  expect(screen.getByText('/fixture/relocated')).toBeVisible()
  click('继续：确定检查目标')
  expect(screen.getByLabelText('检查目标')).toHaveValue('')
  expect(screen.queryByRole('button', { name: '移除 code.ts' })).toBeNull()
  expect(screen.getByRole('button', { name: '继续：选择材料' })).toBeDisabled()
  expect(open).not.toHaveBeenCalled()
})

it('shows one step at a time, reads materials only when needed and preserves choices when going back', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  await selectTarget('Local fixture')
  expect(screen.queryByLabelText('检查目标')).toBeNull()
  expect(screen.queryByTestId('workspace-review-file-picker')).toBeNull()
  expect(listFiles).not.toHaveBeenCalled()
  click('继续：确定检查目标')
  setGoal()
  expect(screen.queryByRole('combobox', { name: '项目' })).toBeNull()
  expect(listFiles).not.toHaveBeenCalled()
  click('继续：选择材料')
  await selectFile('code.ts')
  expect(screen.queryByLabelText('检查目标')).toBeNull()
  click('上一步')
  expect(screen.getByLabelText('检查目标')).toHaveValue('重启后问题的标题和状态保持不变')
  click('上一步')
  expect(screen.getByRole('combobox', { name: '项目' })).toHaveTextContent('Local fixture')
  click('继续：确定检查目标')
  click('继续：选择材料')
  expect(await screen.findByRole('checkbox', { name: 'code.ts' })).toBeChecked()
  expect(analytics).not.toHaveBeenCalled()
  expect(open).not.toHaveBeenCalled()
})

it('lets a suggested goal be edited and protects existing input from another preset', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  await selectTarget('Local fixture')
  click('继续：确定检查目标')
  click('验证问题修复')
  expect(screen.getByLabelText('检查目标')).toHaveValue(
    '重新执行复现步骤后，原问题不再出现，并有与当前版本对应的验证记录。'
  )
  setGoal()
  expect(screen.getByRole('button', { name: '检查交付材料' })).toBeDisabled()
  click('检查交付材料')
  expect(screen.getByLabelText('检查目标')).toHaveValue('重启后问题的标题和状态保持不变')
  click('继续：选择材料')
  await selectFile('code.ts')
  click('进入审阅')
  await waitFor(() =>
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ focus: '重启后问题的标题和状态保持不变' })
    )
  )
})

it('opens contextual guidance, allows dismissal and replay without advancing or submitting', async () => {
  render(<WorkspaceReviewIntake active onOpenReview={vi.fn()} />)
  expect(await screen.findByRole('dialog', { name: '先选一个要检查的项目' })).toBeVisible()
  click('关闭这条提示')
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  click('这一步怎么做')
  expect(await screen.findByRole('dialog', { name: '先选一个要检查的项目' })).toBeVisible()
  await selectTarget('Local fixture')
  click('继续：确定检查目标')
  expect(await screen.findByRole('dialog', { name: '这次想确认什么？' })).toBeVisible()
  const input = screen.getByLabelText('检查目标')
  input.focus()
  expect(screen.getByRole('dialog', { name: '这次想确认什么？' })).toBeVisible()
  expect(input).toHaveFocus()
  setGoal()
  expect(screen.getByRole('dialog', { name: '接下来，点这里' })).toHaveTextContent('继续：选择材料')
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(listFiles).not.toHaveBeenCalled()
  expect(open).not.toHaveBeenCalled()
})
