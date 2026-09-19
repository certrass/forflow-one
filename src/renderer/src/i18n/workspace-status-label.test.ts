import { afterEach, expect, it } from 'vitest'
import { DEFAULT_WORKSPACE_STATUSES } from '../../../shared/workspace-status-defaults'
import { setRendererUiLanguage } from './i18n'
import { workspaceStatusDisplayLabel } from './workspace-status-label'

afterEach(async () => {
  await setRendererUiLanguage('en')
})

it('switches default display labels without mutating their persisted definitions', async () => {
  const before = JSON.stringify(DEFAULT_WORKSPACE_STATUSES)
  await setRendererUiLanguage('zh')
  expect(DEFAULT_WORKSPACE_STATUSES.map(workspaceStatusDisplayLabel)).toEqual([
    '待办',
    '进行中',
    '待审核',
    '已完成'
  ])
  await setRendererUiLanguage('en')
  expect(DEFAULT_WORKSPACE_STATUSES.map(workspaceStatusDisplayLabel)).toEqual([
    'Todo',
    'In progress',
    'In review',
    'Done'
  ])
  expect(JSON.stringify(DEFAULT_WORKSPACE_STATUSES)).toBe(before)
})

it('preserves renamed defaults and custom statuses even when their English labels match', async () => {
  await setRendererUiLanguage('zh')
  for (const status of [
    { id: 'todo', label: 'Client approval' },
    { id: 'completed', label: 'Todo' },
    { id: 'custom', label: 'Done' },
    { id: 'todo', label: '待客户确认' }
  ]) {
    expect(workspaceStatusDisplayLabel(status)).toBe(status.label)
  }
})
