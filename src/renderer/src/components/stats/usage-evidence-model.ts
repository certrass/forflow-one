import type { UsageCostCoverage } from '../../../../shared/usage-cost-coverage'
import type { UsageOverviewInput, UsageProviderOverview } from './usage-overview-types'
import {
  createClaudeProvider,
  createCodexProvider,
  createOpenCodeProvider,
  createMuseProvider
} from './usage-provider-normalization'

export type UsageEvidenceSelection = 'overview' | 'claude' | 'codex' | 'opencode' | 'muse' | 'grok'
export type UsageEvidenceSource = UsageProviderOverview & {
  scope: string
  range: string
  stateLabel: string
  observedRecords: number
  coverage: UsageCostCoverage | null
}

const RANGE_LABELS = {
  '7d': '最近 7 天',
  '30d': '最近 30 天',
  '90d': '最近 90 天',
  all: '全部时间'
}

function checkedCoverage(
  value: UsageCostCoverage | undefined,
  recordCount: number
): UsageCostCoverage | null {
  if (!value) {
    return null
  }
  const counts = [value.pricedRecords, value.unpricedRecords, value.unclassifiedRecords]
  return counts.every((count) => Number.isSafeInteger(count) && count >= 0) &&
    counts.reduce((sum, count) => sum + count, 0) === recordCount
    ? value
    : null
}

function sourceState(source: UsageProviderOverview): string {
  if (!source.enabled) {
    return '未启用'
  }
  if (source.lastScanError) {
    return '读取异常 · 仅保留上次快照'
  }
  if (source.isScanning) {
    return '扫描中 · 当前为已有快照'
  }
  if (!source.lastScanCompletedAt) {
    return '尚未完成扫描'
  }
  return source.activityCount > 0 ? '局部可见' : '当前范围未发现用量记录'
}

export function buildUsageEvidence(
  input: Omit<UsageOverviewInput, 'muse'> & Partial<Pick<UsageOverviewInput, 'muse'>>,
  selection: UsageEvidenceSelection
) {
  const all = [
    createClaudeProvider(input.claude),
    createCodexProvider(input.codex),
    createOpenCodeProvider(input.opencode),
    ...(input.muse ? [createMuseProvider(input.muse)] : [])
  ]
  const sources: UsageEvidenceSource[] = all
    .filter((source) => selection === 'overview' || source.id === selection)
    .map((source) => {
      const summary = input[source.id]?.summary ?? null
      const available = source.enabled && summary !== null && source.lastScanCompletedAt !== null
      const observedRecords = available ? source.activityCount : 0
      return {
        ...source,
        observedRecords,
        estimatedCostUsd:
          available &&
          source.estimatedCostUsd !== null &&
          Number.isFinite(source.estimatedCostUsd) &&
          source.estimatedCostUsd >= 0
            ? source.estimatedCostUsd
            : null,
        scope: summary
          ? summary.scope === 'orca'
            ? 'Forflow 工作区'
            : '当前主机全部日志'
          : '范围待加载',
        range: summary ? RANGE_LABELS[summary.range] : '时间待加载',
        stateLabel: sourceState(source),
        coverage: available ? checkedCoverage(source.costCoverage, observedRecords) : null
      }
    })
  const amounts = sources.flatMap((source) =>
    source.estimatedCostUsd === null ? [] : [source.estimatedCostUsd]
  )
  const unpricedRecords = sources.reduce(
    (sum, source) => sum + (source.coverage?.unpricedRecords ?? 0),
    0
  )
  const unclassifiedRecords = sources.reduce(
    (sum, source) =>
      sum + (source.coverage ? source.coverage.unclassifiedRecords : source.observedRecords),
    0
  )
  const observedRecords = sources.reduce((sum, source) => sum + source.observedRecords, 0)
  return {
    sources,
    estimatedCostUsd: amounts.length ? amounts.reduce((sum, amount) => sum + amount, 0) : null,
    unpricedRecords,
    unclassifiedRecords,
    observedRecords,
    hasReadError: sources.some((source) => source.enabled && source.lastScanError),
    modelCoverage: observedRecords > 0 ? '局部可见' : '暂无可核验记录'
  }
}
