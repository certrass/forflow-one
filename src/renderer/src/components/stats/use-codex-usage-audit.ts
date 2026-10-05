import { useEffect, useState } from 'react'
import type { CodexUsageAudit } from '../../../../shared/codex-usage-audit-types'
import { useAppStore } from '../../store'
import type { UsageEvidenceSelection } from './usage-evidence-model'

export function useCodexUsageAudit(selection: UsageEvidenceSelection) {
  const summary = useAppStore((s) => s.codexUsageSummary)
  const scan = useAppStore((s) => s.codexUsageScanState)
  const scope = summary?.scope
  const range = summary?.range
  const enabled = (selection === 'overview' || selection === 'codex') && scan?.enabled
  const [state, setState] = useState<{
    key: string
    audit: CodexUsageAudit | null
    error: string | null
  } | null>(null)
  const key = JSON.stringify([scope, range, enabled, scan?.lastScanCompletedAt])
  useEffect(() => {
    let cancelled = false
    if (!enabled || !scope || !range) {
      return
    }
    const read = window.api?.codexUsage?.getAudit
    if (!read) {
      setState({ key, audit: null, error: '当前运行端不支持审计明细，请更新 Forflow。' })
      return
    }
    void read({ scope, range })
      .then((audit) => {
        if (!cancelled) {
          setState({ key, audit, error: null })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ key, audit: null, error: '审计明细读取失败，请刷新 Codex 使用量后重试。' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [key, enabled, scope, range])
  return {
    audit: state?.key === key ? state.audit : null,
    error: state?.key === key ? state.error : null,
    loading: enabled && state?.key !== key
  }
}
