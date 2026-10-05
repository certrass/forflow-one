// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { createGlobalSettingsFixture } from '../../../../../shared/global-settings-test-fixture'
import type { ForflowFeishuApi, FeishuPage, FeishuTask } from '../../../../../shared/forflow-feishu'
import { useFeishuTasks } from './use-feishu-tasks'

const originalApi = window.api
const initialState = useAppStore.getState()
const status = {
  installed: true,
  connection: { appId: 'cli_test', userId: 'ou_1', userName: '测试' }
}
const item: FeishuTask = {
  id: 'a',
  title: '任务',
  description: '',
  completed: false,
  dueAt: null,
  updatedAt: null,
  url: null
}
const page: FeishuPage<FeishuTask> = {
  items: [item],
  nextPageToken: 'page-2',
  fetchedAt: '2026-09-20T00:00:00Z'
}
let api: ForflowFeishuApi
beforeEach(() => {
  api = {
    status: vi.fn(async () => status),
    connect: vi.fn(async () => status),
    disconnect: vi.fn(async () => {}),
    tasks: vi.fn(async () => page),
    tasklists: vi.fn(async () => ({ items: [], nextPageToken: null, fetchedAt: page.fetchedAt })),
    task: vi.fn(async () => item)
  }
  Object.defineProperty(window, 'api', { configurable: true, value: { forflowFeishu: api } })
  useAppStore.setState({
    settings: createGlobalSettingsFixture({ activeRuntimeEnvironmentId: null })
  })
})
afterEach(() => {
  cleanup()
  useAppStore.setState(initialState, true)
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
})

it('requires an explicit read, merges pages, and discards old results when scope changes', async () => {
  const { result } = renderHook(() => useFeishuTasks())
  act(() => result.current.setStatus(status))
  expect(api.tasks).not.toHaveBeenCalled()
  await act(() => result.current.load())
  expect(api.tasks).toHaveBeenCalledExactlyOnceWith({ completed: false })
  vi.mocked(api.tasks).mockResolvedValueOnce({
    ...page,
    items: [item, { ...item, id: 'b' }],
    nextPageToken: null
  })
  await act(() => result.current.load(true))
  expect(result.current.tasks?.items.map((task) => task.id)).toEqual(['a', 'b'])
  expect(api.tasks).toHaveBeenLastCalledWith({ completed: false, pageToken: 'page-2' })
  act(() => result.current.setTasklistId('list-1'))
  expect(result.current.tasks).toBeNull()
  await act(() => result.current.load())
  expect(api.tasks).toHaveBeenLastCalledWith({ completed: false, tasklistId: 'list-1' })
})

it('locks double clicks and ignores a late response after disconnect', async () => {
  const pending = Promise.withResolvers<FeishuPage<FeishuTask>>()
  vi.mocked(api.tasks).mockReturnValue(pending.promise)
  const { result } = renderHook(() => useFeishuTasks())
  act(() => result.current.setStatus(status))
  let first: Promise<void> | undefined
  act(() => {
    first = result.current.load()
    void result.current.load()
  })
  expect(api.tasks).toHaveBeenCalledTimes(1)
  act(() => result.current.setStatus(null))
  await act(async () => {
    pending.resolve(page)
    await first
  })
  expect(result.current.tasks).toBeNull()
  expect(result.current.selected).toBeNull()
})

it('clears loaded data and refuses local reads when switching to a remote runtime', async () => {
  const { result } = renderHook(() => useFeishuTasks())
  act(() => result.current.setStatus(status))
  await act(() => result.current.load())
  act(() =>
    useAppStore.setState({
      settings: createGlobalSettingsFixture({ activeRuntimeEnvironmentId: 'remote-1' })
    })
  )
  await waitFor(() => expect(result.current.connected).toBe(false))
  await act(() => result.current.load())
  expect(api.tasks).toHaveBeenCalledTimes(1)
  expect(result.current.tasks).toBeNull()
})

it('keeps a recoverable error without claiming an empty successful result', async () => {
  vi.mocked(api.tasks).mockRejectedValueOnce(
    new Error("Error invoking remote method 'forflow:feishu:tasks': Error: 授权已失效")
  )
  const { result } = renderHook(() => useFeishuTasks())
  act(() => result.current.setStatus(status))
  await act(() => result.current.load())
  expect(result.current.tasks).toBeNull()
  expect(result.current.error).toBe('授权已失效')
  await act(() => result.current.load())
  expect(result.current.tasks?.items).toHaveLength(1)
  expect(result.current.error).toBeNull()
})
