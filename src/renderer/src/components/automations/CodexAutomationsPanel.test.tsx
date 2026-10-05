// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CodexAutomationsPanel } from './CodexAutomationsPanel'
import type { CodexAutomationList } from '../../../../shared/codex-automations'

const data: CodexAutomationList = {
  sourceDirectory: '/local/.codex/automations',
  status: 'ready',
  readAt: 1000,
  issues: [],
  automations: [
    {
      id: 'daily',
      name: '每日复核',
      prompt: '核对资料',
      kind: 'cron',
      status: 'PAUSED',
      rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0',
      model: null,
      cwds: ['/project'],
      targetThreadId: null,
      updatedAt: 100,
      sourcePath: '/local/.codex/automations/daily/automation.toml'
    }
  ]
}
const read = vi.fn<() => Promise<CodexAutomationList>>()
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
function setup() {
  vi.stubGlobal('api', undefined)
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { automations: { listLocalCodex: read } }
  })
  return render(<CodexAutomationsPanel />)
}
it('shows the local source and paused task, searches and refreshes definitions', async () => {
  read.mockResolvedValue(data)
  setup()
  await screen.findByText('每日复核')
  expect(screen.getByText('已暂停')).toBeTruthy()
  expect(screen.getByText(/读取目录/).textContent).toContain('/local/.codex/automations')
  expect(screen.queryByRole('button', { name: /运行|删除|暂停/ })).toBeNull()
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '不存在' } })
  expect(screen.queryByText('每日复核')).toBeNull()
  expect(screen.getByText('没有匹配的任务。')).toBeTruthy()
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
  read.mockResolvedValue({ ...data, automations: [] })
  fireEvent.click(screen.getByRole('button', { name: '刷新' }))
  await screen.findByText(/未在此目录读到/)
  expect(screen.queryByText('每日复核')).toBeNull()
})
it('displays permission errors alongside successfully read tasks', async () => {
  read.mockResolvedValue({
    ...data,
    status: 'partial',
    issues: [{ path: '/locked', code: 'permission' }]
  })
  setup()
  await screen.findByText('每日复核')
  expect(screen.getByRole('alert').textContent).toContain('没有读取权限')
})
it('handles IPC failure and allows retry without showing stale tasks or raw errors', async () => {
  read.mockRejectedValue(new Error('Error invoking remote method: private prompt'))
  setup()
  expect((await screen.findByRole('alert')).textContent).not.toContain('private prompt')
  read.mockResolvedValue(data)
  fireEvent.click(screen.getByRole('button', { name: '刷新' }))
  await screen.findByText('每日复核')
  expect(screen.queryByRole('alert')).toBeNull()
})
