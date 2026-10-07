import { useMemo, useState } from 'react'
import { useNow } from '@/hooks/use-now'
import type { CodexUsageDailyPoint, CodexUsageRange } from '../../../../shared/codex-usage-types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { buildCodexUsageChart } from './codex-usage-chart-series'
import { formatTokens } from './usage-formatters'
import { usageWorkspaceCopy } from './usage-workspace-copy'

export function CodexUsageDailyChart({
  daily,
  range = '30d',
  reportedTotals = false
}: {
  daily: CodexUsageDailyPoint[]
  range?: CodexUsageRange
  reportedTotals?: boolean
}): React.JSX.Element {
  const c = usageWorkspaceCopy()
  const [group, setGroup] = useState('types')
  const now = useNow(60_000)
  const points = useMemo(
    () => buildCodexUsageChart(daily, range, new Date(now), reportedTotals),
    [daily, range, now, reportedTotals]
  )
  const max = Math.max(1, ...points.map((point) => point.total))
  const totals = points.reduce(
    (sum, point) => ({
      input: sum.input + point.input,
      cached: sum.cached + point.cached,
      output: sum.output + point.output,
      total: sum.total + point.total
    }),
    { input: 0, cached: 0, output: 0, total: 0 }
  )
  const segments =
    reportedTotals || group === 'total'
      ? ([{ key: 'total', label: c.tokens, color: 'bg-chart-2', value: totals.total }] as const)
      : ([
          { key: 'input', label: c.input, color: 'bg-chart-2', value: totals.input },
          { key: 'cached', label: c.cached, color: 'bg-chart-1', value: totals.cached },
          { key: 'output', label: c.output, color: 'bg-chart-4', value: totals.output }
        ] as const)
  const first = points[0]
  const middle = points[Math.floor(points.length / 2)]
  const last = points.at(-1)
  return (
    <div
      className="space-y-5 rounded-xl border border-border bg-card p-5 text-card-foreground"
      data-testid="codex-usage-history"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{c.tokens}</p>
          <p className="mt-1 text-2xl font-medium tabular-nums">{formatTokens(totals.total)}</p>
        </div>
        {!reportedTotals && (
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger size="sm" aria-label={c.chartGrouping}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="types">{c.tokenTypes}</SelectItem>
              <SelectItem value="total">{c.dailyTotal}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex gap-3">
        <div
          aria-hidden
          className="flex w-10 shrink-0 flex-col justify-between pb-7 text-right text-xs tabular-nums text-muted-foreground"
        >
          <span>{formatTokens(max)}</span>
          <span>{formatTokens(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-48">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex flex-col justify-between"
            >
              <div className="border-t border-border/60" />
              <div className="border-t border-border/60" />
              <div className="border-t border-border/60" />
              <div className="border-t border-border/60" />
              <div className="border-t border-border/60" />
            </div>
            <TooltipProvider delayDuration={120}>
              <div
                className="relative grid h-full items-end gap-1"
                style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
              >
                {points.map((point) => {
                  const label =
                    point.start === point.end ? point.start : `${point.start} – ${point.end}`
                  return (
                    <Tooltip key={point.start}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="group flex h-full min-w-0 items-end justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`${label}: ${point.total.toLocaleString()} tokens`}
                        >
                          <span
                            className="flex w-full max-w-12 flex-col-reverse overflow-hidden rounded-t-sm transition-opacity group-hover:opacity-80"
                            style={{ height: `${(point.total / max) * 100}%` }}
                          >
                            {segments.map((segment) => (
                              <span
                                key={segment.key}
                                className={segment.color}
                                style={{
                                  height: `${point.total ? (point[segment.key] / point.total) * 100 : 0}%`
                                }}
                              />
                            ))}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{label}</p>
                        {segments.map((segment) => (
                          <p key={segment.key}>
                            {segment.label}: {point[segment.key].toLocaleString()}
                          </p>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>
            {totals.total === 0 && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                {c.chartEmpty}
              </p>
            )}
          </div>
          <div
            aria-hidden
            className="mt-3 flex justify-between gap-2 text-xs tabular-nums text-muted-foreground"
          >
            <span>{first?.start.slice(5)}</span>
            <span>{middle?.start.slice(5)}</span>
            <span>{last?.end.slice(5)}</span>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {segments.map((segment) => (
          <div key={segment.key} className="flex gap-3">
            <span className={segment.color} style={{ width: 3, borderRadius: 2 }} />
            <div>
              <dt className="text-xs text-muted-foreground">{segment.label}</dt>
              <dd className="mt-1 text-sm font-medium tabular-nums">
                {totals.total
                  ? ((segment.value / totals.total) * 100).toLocaleString(undefined, {
                      maximumFractionDigits: 1
                    })
                  : '0'}
                %{' '}
                <span className="ml-2 font-normal text-muted-foreground">
                  {formatTokens(segment.value)}
                </span>
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        {reportedTotals ? c.reportedTotalsNote : c.chartNote}
      </p>
    </div>
  )
}
