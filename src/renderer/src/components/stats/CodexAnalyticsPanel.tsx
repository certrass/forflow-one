import { RefreshCw } from 'lucide-react'
import type { CodexReview } from '../../../../shared/codex-review-types'
import { useAppStore } from '../../store'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { reviewCopy } from './review-copy'
import { usageWorkspaceCopy } from './usage-workspace-copy'
import { RANGE_OPTIONS, RANGE_LABELS, SCOPE_OPTIONS } from './codex-usage-filter-options'
import { CodexUsageDailyChart } from './CodexUsageDailyChart'
import { CodexAnalyticsChats } from './CodexAnalyticsChats'
import { CodexAnalyticsBreakdown } from './CodexAnalyticsBreakdown'
import { useCodexAnalytics } from './use-codex-analytics'
import { formatUpdatedAt } from './usage-formatters'
import { CodexTranscriptSearch } from './CodexTranscriptSearch'

export function CodexAnalyticsPanel({
  active,
  mode = 'analytics',
  onOpenReview,
  revision
}: {
  active: boolean
  mode?: 'analytics' | 'review'
  onOpenReview: (review: CodexReview) => void
  revision: number
}): React.JSX.Element {
  const c = reviewCopy()
  const u = usageWorkspaceCopy()
  const {
    scan,
    scope,
    range,
    filters,
    setFilters,
    data,
    projects,
    error,
    opening,
    openReview,
    refresh
  } = useCodexAnalytics(active, revision, onOpenReview)
  const setScope = useAppStore((s) => s.setCodexUsageScope)
  const setRange = useAppStore((s) => s.setCodexUsageRange)
  const enable = useAppStore((s) => s.enableCodexUsage)
  const summary = useAppStore((s) => s.codexUsageSummary)
  const daily = useAppStore((s) => s.codexUsageDaily)
  const current = summary?.scope === scope && summary.range === range
  const update = (patch: Partial<typeof filters>): void =>
    setFilters((value) => ({ ...value, page: 1, ...patch }))
  if (!scan?.enabled) {
    return (
      <section className="space-y-4 rounded-xl border border-border p-6">
        <h3 className="text-base font-medium">{u.enabledTitle}</h3>
        <p className="text-sm text-muted-foreground">{u.enabledDescription}</p>
        <Button onClick={() => void enable()}>{u.enable}</Button>
      </section>
    )
  }
  return (
    <div
      className="min-w-0 space-y-8"
      data-testid={mode === 'review' ? 'codex-review-list' : 'codex-analytics'}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span>Codex</span>
          <Badge variant="outline">Beta</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CodexTranscriptSearch active={active} onOpenReview={onOpenReview} />
          <Select
            value={scope}
            onValueChange={(value) => {
              if (value === 'all' || value === 'orca') {
                void setScope(value)
                update({ project: '' })
              }
            }}
          >
            <SelectTrigger size="sm" aria-label={c.scope}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            disabled={scan.isScanning}
            onClick={() => void refresh()}
          >
            <RefreshCw />
            {c.refresh}
          </Button>
        </div>
      </div>
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-medium">
              {mode === 'review' ? u.reviewTitle : u.history}
            </h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {mode === 'review' ? u.reviewDescription : u.historyDescription}
            </p>
          </div>
          <Tabs
            value={range}
            onValueChange={(value) => {
              if (value === 'all' || value === '7d' || value === '30d' || value === '90d') {
                void setRange(value)
                update({})
              }
            }}
          >
            <TabsList aria-label={c.range}>
              {RANGE_OPTIONS.map((value) => (
                <TabsTrigger value={value} key={value} aria-label={RANGE_LABELS[value]}>
                  {value === 'all' ? u.allTime : value}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {mode === 'analytics' &&
          (current ? (
            <CodexUsageDailyChart daily={daily} range={range} />
          ) : (
            <p role="status" className="py-12 text-sm text-muted-foreground">
              {c.loading}
            </p>
          ))}
      </section>
      <section className="space-y-4">
        {mode === 'analytics' && (
          <div className="space-y-1">
            <h3 className="text-base font-medium">{u.topChats}</h3>
            <p className="text-sm text-muted-foreground">{u.chatsDescription}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-48 flex-1">
            <Input
              aria-label={c.search}
              placeholder={c.search}
              value={filters.search}
              maxLength={200}
              onChange={(event) => update({ search: event.target.value })}
            />
          </div>
          <Select
            value={filters.project || '__all__'}
            onValueChange={(value) => update({ project: value === '__all__' ? '' : value })}
          >
            <SelectTrigger size="sm" aria-label={c.project} className="max-w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{c.allProjects}</SelectItem>
              {projects.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.order}
            onValueChange={(value) => {
              if (value === 'recent' || value === 'tokens' || value === 'cost') {
                update({ order: value })
              }
            }}
          >
            <SelectTrigger size="sm" aria-label={u.sort}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tokens">{u.highestTokens}</SelectItem>
              <SelectItem value="recent">{u.recent}</SelectItem>
              <SelectItem value="cost">{u.highestCost}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {data ? (
          <CodexAnalyticsChats
            key={JSON.stringify([scope, range, filters, revision])}
            data={data}
            opening={opening}
            onOpen={(id) => void openReview(id)}
            onPage={(page) => update({ page })}
          />
        ) : (
          !error && (
            <p role="status" className="py-8 text-sm text-muted-foreground">
              {c.loading}
            </p>
          )
        )}
        <p className="text-xs text-muted-foreground">{u.priceNote}</p>
      </section>
      {mode === 'analytics' && current && <CodexAnalyticsBreakdown />}
      <footer className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <p>
          {formatUpdatedAt(scan.lastScanCompletedAt)} · {c.localScope}
        </p>
        <p>{u.scopeNote}</p>
        {scan.lastScanError && (
          <p role="alert" className="text-destructive">
            {scan.lastScanError}
          </p>
        )}
      </footer>
    </div>
  )
}
