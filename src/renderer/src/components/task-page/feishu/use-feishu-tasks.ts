import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store'
import { readIpcErrorMessage } from '@/lib/ipc-error'
import {
  getSettingsFocusedExecutionHostId,
  LOCAL_EXECUTION_HOST_ID
} from '../../../../../shared/execution-host'
import type {
  FeishuStatus,
  FeishuTask,
  FeishuTasklist,
  FeishuPage
} from '../../../../../shared/forflow-feishu'

function mergeById<T extends { id: string }>(old: T[], incoming: T[]): T[] {
  return [...new Map([...old, ...incoming].map((item) => [item.id, item])).values()]
}

export function useFeishuTasks() {
  const host = useAppStore((s) => getSettingsFocusedExecutionHostId(s.settings))
  const [status, setStatus] = useState<FeishuStatus | null>(null)
  const [tasklistId, setTasklistId] = useState('mine')
  const [completed, setCompleted] = useState(false)
  const [tasklists, setTasklists] = useState<FeishuPage<FeishuTasklist> | null>(null)
  const [tasks, setTasks] = useState<FeishuPage<FeishuTask> | null>(null)
  const [selected, setSelected] = useState<{ task: FeishuTask; fetchedAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const epoch = useRef({ value: 0 })
  const locked = useRef(false)
  const connected = host === LOCAL_EXECUTION_HOST_ID && Boolean(status?.connection)
  const connectionKey = status?.connection
    ? `${status.connection.appId}/${status.connection.userId}`
    : ''

  const run = useCallback(
    async (action: (isCurrent: () => boolean) => Promise<void>) => {
      if (!connected || locked.current) {
        return
      }
      const generation = epoch.current.value
      const isCurrent = (): boolean => generation === epoch.current.value
      locked.current = true
      setBusy(true)
      setError(null)
      try {
        await action(isCurrent)
      } catch (cause) {
        if (isCurrent()) {
          setError(readIpcErrorMessage(cause) ?? '读取失败，请重试。')
        }
      } finally {
        if (isCurrent()) {
          locked.current = false
          setBusy(false)
        }
      }
    },
    [connected]
  )

  useEffect(() => {
    epoch.current.value++
    locked.current = false
    setBusy(false)
    setTasks(null)
    setTasklists(null)
    setSelected(null)
    setError(null)
    const epochState = epoch.current
    return () => {
      epochState.value++
    }
  }, [connectionKey, connected])
  useEffect(() => {
    epoch.current.value++
    locked.current = false
    setBusy(false)
    setTasks(null)
    setSelected(null)
    setError(null)
  }, [tasklistId, completed])

  const load = (more = false): Promise<void> =>
    run(async (current) => {
      const api = window.api.forflowFeishu
      if (!api) {
        return
      }
      const page = await api.tasks({
        completed,
        ...(tasklistId !== 'mine' ? { tasklistId } : {}),
        ...(more && tasks?.nextPageToken ? { pageToken: tasks.nextPageToken } : {})
      })
      if (current()) {
        setTasks((previous) => ({
          ...page,
          items: more ? mergeById(previous?.items ?? [], page.items) : page.items
        }))
        if (!more) {
          setSelected(null)
        }
      }
    })
  const loadLists = (more = false): Promise<void> =>
    run(async (current) => {
      const page = await window.api.forflowFeishu?.tasklists(
        more ? (tasklists?.nextPageToken ?? undefined) : undefined
      )
      if (page && current()) {
        setTasklists((previous) => ({
          ...page,
          items: more ? mergeById(previous?.items ?? [], page.items) : page.items
        }))
      }
    })
  const select = (id: string): Promise<void> =>
    run(async (current) => {
      setSelected(null)
      const task = await window.api.forflowFeishu?.task(id)
      if (task && current()) {
        setSelected({ task, fetchedAt: new Date().toISOString() })
      }
    })
  return {
    status,
    setStatus,
    connected,
    tasklistId,
    setTasklistId,
    completed,
    setCompleted,
    tasklists,
    tasks,
    selected,
    error,
    busy,
    load,
    loadLists,
    select
  }
}
