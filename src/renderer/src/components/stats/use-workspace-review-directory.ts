import { useEffect, useState } from 'react'
import type { WorkspaceReviewDirectory } from '../../../../shared/workspace-review-types'
import { workspaceReviewFileCopy } from './workspace-review-file-copy'

export function useWorkspaceReviewDirectory(workspaceId: string, directory: string) {
  const c = workspaceReviewFileCopy()
  const [refresh, setRefresh] = useState(0)
  const requestKey = JSON.stringify([workspaceId, directory, refresh])
  const [state, setState] = useState<{
    requestKey: string
    result: WorkspaceReviewDirectory | null
    error: string | null
  } | null>(null)
  const [showLoading, setShowLoading] = useState(false)
  useEffect(() => {
    let active = true
    setShowLoading(false)
    const timer = setTimeout(() => setShowLoading(true), 200)
    const read = window.api?.codexUsage?.listWorkspaceReviewFiles
    const finish = (result: WorkspaceReviewDirectory | null, error: string | null): void => {
      if (active) {
        clearTimeout(timer)
        setShowLoading(false)
        setState({ requestKey, result, error })
      }
    }
    if (!read) {
      finish(null, c.unavailable)
    } else {
      void read({ workspaceId, directory })
        .then((result) => finish(result, null))
        .catch(() => finish(null, c.error))
    }
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [workspaceId, directory, requestKey, c.error, c.unavailable])
  const current = state?.requestKey === requestKey ? state : null
  return {
    result: current?.result ?? null,
    error: current?.error ?? null,
    loading: !current,
    showLoading: !current && showLoading,
    retry: () => setRefresh((value) => value + 1)
  }
}
