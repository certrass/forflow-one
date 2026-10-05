import { useEffect } from 'react'
import { Activity, Brain, DatabaseZap, FolderKanban, Sparkles } from 'lucide-react'
import { RANGE_OPTIONS, RANGE_LABELS, SCOPE_OPTIONS } from './codex-usage-filter-options'
import { useAppStore } from '../../store'
import { ClaudeUsageLoadingState } from './ClaudeUsageLoadingState'
import { CodexUsageDetails } from './CodexUsageDetails'
import { ShareUsageButton } from './ShareUsageButton'
import { StatCard } from './StatCard'
import { UsageCostCard } from './UsageCostCard'
import { UsageEvidencePanel } from './UsageEvidencePanel'
import { UsageFilterRadioGroup, UsageTrackingPaneShell } from './UsageTrackingPaneShell'
import { formatTokens, formatUpdatedAt } from './usage-formatters'
import { translate } from '@/i18n/i18n'

export function CodexUsagePane(): React.JSX.Element {
  const scanState = useAppStore((state) => state.codexUsageScanState)
  const summary = useAppStore((state) => state.codexUsageSummary)
  const daily = useAppStore((state) => state.codexUsageDaily)
  const modelBreakdown = useAppStore((state) => state.codexUsageModelBreakdown)
  const projectBreakdown = useAppStore((state) => state.codexUsageProjectBreakdown)
  const scope = useAppStore((state) => state.codexUsageScope)
  const range = useAppStore((state) => state.codexUsageRange)
  const fetchCodexUsage = useAppStore((state) => state.fetchCodexUsage)
  const setCodexUsageEnabled = useAppStore((state) => state.setCodexUsageEnabled)
  const refreshCodexUsage = useAppStore((state) => state.refreshCodexUsage)
  const setCodexUsageScope = useAppStore((state) => state.setCodexUsageScope)
  const setCodexUsageRange = useAppStore((state) => state.setCodexUsageRange)
  const recordFeatureInteraction = useAppStore((state) => state.recordFeatureInteraction)

  useEffect(() => {
    void fetchCodexUsage()
  }, [fetchCodexUsage])

  const handleSetEnabled = (enabled: boolean): void => {
    recordFeatureInteraction('usage-tracking')
    void setCodexUsageEnabled(enabled)
  }

  const title = translate('auto.components.stats.CodexUsagePane.408210470c', 'Codex Usage Tracking')
  const enableLabel = translate(
    'auto.components.stats.CodexUsagePane.f7c1affbd5',
    'Enable Codex usage analytics'
  )

  if (!scanState?.enabled) {
    return (
      <UsageTrackingPaneShell
        enabled={false}
        summaryContent={<UsageEvidencePanel selection="codex" />}
        title={title}
        disabledDescription={translate(
          'auto.components.stats.CodexUsagePane.13badcd8f2',
          'Reads local Codex usage logs to show token, model, and session stats.'
        )}
        enableLabel={enableLabel}
        onEnabledChange={handleSetEnabled}
      />
    )
  }

  if (!summary && (scanState.isScanning || scanState.lastScanCompletedAt === null)) {
    return (
      <ClaudeUsageLoadingState
        title={title}
        summaryCardCount={6}
        summaryGridClassName="md:grid-cols-3"
      />
    )
  }

  const hasAnyData = summary?.hasAnyCodexData ?? scanState.hasAnyCodexData

  return (
    <UsageTrackingPaneShell
      enabled
      title={title}
      status={
        <>
          {formatUpdatedAt(scanState.lastScanCompletedAt)}
          {scanState.lastScanError
            ? translate(
                'auto.components.stats.CodexUsagePane.8a6655f7a2',
                ' • Last scan error: {{value0}}',
                { value0: scanState.lastScanError }
              )
            : ''}
        </>
      }
      isRefreshing={scanState.isScanning}
      hasData={hasAnyData}
      enableLabel={enableLabel}
      optionsLabel={translate(
        'auto.components.stats.CodexUsagePane.70b5b8581f',
        'Codex usage options'
      )}
      filtersLabel={translate('auto.components.stats.CodexUsagePane.1af1a39b2f', 'Filters')}
      refreshAriaLabel={translate(
        'auto.components.stats.CodexUsagePane.ec4d270e2c',
        'Refresh Codex usage'
      )}
      refreshLabel={translate('auto.components.stats.CodexUsagePane.3022cda443', 'Refresh')}
      filterSections={[
        <UsageFilterRadioGroup
          key="scope"
          label={translate('auto.components.stats.CodexUsagePane.6d68e8399a', 'Scope')}
          value={scope}
          options={SCOPE_OPTIONS}
          onValueChange={(value) => void setCodexUsageScope(value)}
        />,
        <UsageFilterRadioGroup
          key="range"
          label={translate('auto.components.stats.CodexUsagePane.89162e019b', 'Range')}
          value={range}
          options={RANGE_OPTIONS.map((value) => ({ value, label: RANGE_LABELS[value] }))}
          onValueChange={(value) => void setCodexUsageRange(value)}
        />
      ]}
      selectionSummary={
        <>
          {SCOPE_OPTIONS.find((option) => option.value === scope)?.label} • {RANGE_LABELS[range]}
        </>
      }
      emptyMessage={translate(
        'auto.components.stats.CodexUsagePane.4c865393b4',
        'No local Codex usage found yet for this scope.'
      )}
      onEnabledChange={handleSetEnabled}
      onRefresh={() => void refreshCodexUsage()}
      headerAction={
        summary && daily.length > 0 ? (
          <ShareUsageButton provider="codex" summary={summary} daily={daily} range={range} />
        ) : undefined
      }
      summaryContent={
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard
              label={translate('auto.components.stats.CodexUsagePane.e365eaa6fd', 'Input tokens')}
              value={formatTokens(summary?.inputTokens ?? 0)}
              icon={<Sparkles className="size-4" />}
            />
            <StatCard
              label={translate('auto.components.stats.CodexUsagePane.5d8eba87bd', 'Output tokens')}
              value={formatTokens(summary?.outputTokens ?? 0)}
              icon={<Activity className="size-4" />}
            />
            <StatCard
              label={translate('auto.components.stats.CodexUsagePane.a9ac0f423a', 'Cached input')}
              value={formatTokens(summary?.cachedInputTokens ?? 0)}
              icon={<DatabaseZap className="size-4" />}
            />
            <StatCard
              label={translate(
                'auto.components.stats.CodexUsagePane.6e18146e9b',
                'Reasoning output'
              )}
              value={formatTokens(summary?.reasoningOutputTokens ?? 0)}
              icon={<Brain className="size-4" />}
            />
            <StatCard
              label={translate(
                'auto.components.stats.CodexUsagePane.907b31865f',
                'Sessions / Events'
              )}
              value={`${(summary?.sessions ?? 0).toLocaleString()} / ${(summary?.events ?? 0).toLocaleString()}`}
              icon={<FolderKanban className="size-4" />}
            />
            <UsageCostCard selection="codex" />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            {translate(
              'auto.components.stats.CodexUsagePane.94ac1f1ee7',
              'Reasoning tokens are shown for visibility, but cost is calculated from uncached input, cached input, and output only.'
            )}
          </p>
          <UsageEvidencePanel selection="codex" />
        </>
      }
    >
      <CodexUsageDetails
        daily={daily}
        modelBreakdown={modelBreakdown}
        projectBreakdown={projectBreakdown}
        summary={summary}
      />
    </UsageTrackingPaneShell>
  )
}
