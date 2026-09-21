import { useEffect, useRef, useState } from 'react'
import type {
  CodexAnalyticsQuery,
  CodexAnalyticsResult,
  CodexReview
} from '../../../../shared/codex-review-types'
import { useAppStore } from '../../store'
import { reviewCopy } from './review-copy'

type ChatFilters = Pick<CodexAnalyticsQuery, 'search' | 'project' | 'order' | 'page'>

export function useCodexAnalytics(
  active: boolean,
  revision: number,
  onOpenReview: (review: CodexReview) => void
) {
  const scan = useAppStore((state) => state.codexUsageScanState)
  const scope = useAppStore((state) => state.codexUsageScope)
  const range = useAppStore((state) => state.codexUsageRange)
  const fetchUsage = useAppStore((state) => state.fetchCodexUsage)
  const refreshUsage = useAppStore((state) => state.refreshCodexUsage)
  const [filters, setFilters] = useState<ChatFilters>({
    search: '',
    project: '',
    order: 'tokens',
    page: 1
  })
  const [refresh, setRefresh] = useState(0)
  const [result, setResult] = useState<{
    key: string
    scope: string
    data: CodexAnalyticsResult
  } | null>(null)
  const [error, setError] = useState<{ key: string; message: string } | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const scopeKey = JSON.stringify([scope, range, scan?.enabled])
  const currentScope = useRef(scopeKey)
  const currentActive = useRef(active)
  currentActive.current = active
  currentScope.current = scopeKey
  const key = JSON.stringify([scopeKey, filters, refresh, revision, scan?.lastScanCompletedAt])
  const { search, project, order, page } = filters
  useEffect(() => {
    if (active) {
      void fetchUsage()
    }
  }, [active, fetchUsage])
  useEffect(() => {
    let cancelled = false
    if (!active || !scan?.enabled) {
      return
    }
    const timer = setTimeout(() => {
      const read = window.api?.codexUsage?.getAnalytics
      if (!read) {
        setError({ key, message: reviewCopy().unavailable })
        return
      }
      void read({ scope, range, search, project, order, page, pageSize: 20 })
        .then((data) => {
          if (!cancelled) {
            setResult({ key, scope: scopeKey, data })
            setError(null)
          }
        })
        .catch((reason: unknown) => {
          if (!cancelled) {
            setError({
              key,
              message: reason instanceof Error ? reason.message : reviewCopy().error
            })
          }
        })
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key, active, scan?.enabled, scopeKey, scope, range, search, project, order, page])
  const openReview = async (sessionId: string): Promise<void> => {
    if (opening) {
      return
    }
    const open = window.api?.codexUsage?.openReview
    if (!open) {
      setError({ key, message: reviewCopy().unavailable })
      return
    }
    setOpening(sessionId)
    try {
      const value = await open({ sessionId, scope, range, focus: reviewCopy().defaultFocus })
      if (currentScope.current === scopeKey && currentActive.current) {
        onOpenReview(value)
      }
    } catch (reason) {
      if (currentScope.current === scopeKey && currentActive.current) {
        setError({ key, message: reason instanceof Error ? reason.message : reviewCopy().error })
      }
    } finally {
      setOpening(null)
    }
  }
  return {
    scan,
    scope,
    range,
    filters,
    setFilters,
    opening,
    openReview,
    data: result?.key === key ? result.data : null,
    projects: result?.scope === scopeKey ? result.data.projects : [],
    error: error?.key === key ? error.message : null,
    refresh: async () => {
      try {
        await refreshUsage()
        setRefresh((value) => value + 1)
      } catch (reason) {
        setError({ key, message: reason instanceof Error ? reason.message : reviewCopy().error })
      }
    }
  }
}
