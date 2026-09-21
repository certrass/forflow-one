import { Fragment, useId, useState } from 'react'
import { ArrowUpRight, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import type { CodexAnalyticsResult, CodexAnalyticsRow } from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'
import { reviewCopy } from './review-copy'
import { usageWorkspaceCopy } from './usage-workspace-copy'
import { formatCost, formatTokens, formatSessionTime } from './usage-formatters'

function ChatDetails({
  row,
  saved,
  opening,
  onOpen
}: {
  row: CodexAnalyticsRow
  saved: CodexAnalyticsResult['reviews'][string] | undefined
  opening: string | null
  onOpen: (id: string) => void
}): React.JSX.Element {
  const c = reviewCopy()
  const u = usageWorkspaceCopy()
  const details = [
    [c.model, row.models.join(' · ') || c.unknown],
    [c.project, row.projectLabels.join(' · ') || c.unknown],
    [c.lastActive, formatSessionTime(row.lastActiveAt)],
    [
      u.input,
      row.inputTokens === null
        ? '—'
        : formatTokens(Math.max(0, row.inputTokens - (row.cachedInputTokens ?? 0)))
    ],
    [u.cached, row.cachedInputTokens === null ? '—' : formatTokens(row.cachedInputTokens)],
    [u.output, row.outputTokens === null ? '—' : formatTokens(row.outputTokens)],
    [u.sourceFiles, row.sourceFiles],
    [u.savedVersion, saved?.versions ?? '—']
  ]
  return (
    <div className="space-y-4 px-5 py-4 sm:pl-12">
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 text-xs">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {row.coverage === 'unavailable' && (
        <p className="text-xs text-muted-foreground">{c.periodUnknown}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={opening !== null}
          onClick={() => onOpen(row.sessionId)}
        >
          {opening === row.sessionId ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}
          {saved ? c.open : c.start}
        </Button>
        <span className="text-xs text-muted-foreground">
          {saved
            ? saved.status === 'confirmed'
              ? c.confirmed
              : saved.status === 'issues'
                ? c.hasIssues
                : c.reviewing
            : c.unreviewed}
        </span>
      </div>
    </div>
  )
}

export function CodexAnalyticsChats({
  data,
  opening,
  onOpen,
  onPage
}: {
  data: CodexAnalyticsResult
  opening: string | null
  onOpen: (id: string) => void
  onPage: (page: number) => void
}): React.JSX.Element {
  const c = reviewCopy()
  const u = usageWorkspaceCopy()
  const id = useId()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const rows = showAll ? data.rows : data.rows.slice(0, 5)
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto scrollbar-sleek">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-5 py-3 text-left font-normal">{c.chat}</th>
                <th className="px-4 py-3 text-right font-normal whitespace-nowrap">{c.tokens}</th>
                <th className="px-5 py-3 text-right font-normal whitespace-nowrap">{c.cost}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const open = expanded === row.sessionId
                const saved = data.reviews[row.sessionId]
                const detailId = `${id}-${index}`
                return (
                  <Fragment key={row.sessionId}>
                    <tr
                      className={cn('border-b border-border last:border-0', open && 'bg-muted/40')}
                      data-session-id={row.sessionId}
                    >
                      <td className="w-full max-w-0">
                        <button
                          type="button"
                          className="flex w-full min-w-48 items-center gap-3 px-5 py-4 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                          aria-label={row.title ?? row.sessionId}
                          aria-expanded={open}
                          aria-controls={detailId}
                          onClick={() => setExpanded(open ? null : row.sessionId)}
                        >
                          {open ? (
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate" title={row.title ?? row.sessionId}>
                            {row.title ?? row.sessionId}
                          </span>
                          {saved?.status === 'issues' && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {c.hasIssues}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums whitespace-nowrap">
                        {row.totalTokens === null ? '—' : formatTokens(row.totalTokens)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap">
                        {row.estimatedCostUsd === null ? '—' : formatCost(row.estimatedCostUsd)}
                        {row.unpricedEvents > 0 && (
                          <p className="text-xs text-muted-foreground">{c.partial}</p>
                        )}
                      </td>
                    </tr>
                    {open && (
                      <tr
                        id={detailId}
                        className="border-b border-border bg-muted/40 last:border-0"
                      >
                        <td colSpan={3}>
                          <ChatDetails row={row} saved={saved} opening={opening} onOpen={onOpen} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">{c.empty}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {data.rows.length > 5 && (
            <Button size="sm" variant="secondary" onClick={() => setShowAll((value) => !value)}>
              {showAll ? u.showLess : u.showMore}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {data.total} · {data.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}
          </span>
          <Button
            variant="ghost"
            size="xs"
            disabled={data.page <= 1}
            onClick={() => onPage(data.page - 1)}
          >
            {c.previous}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            disabled={data.page * data.pageSize >= data.total}
            onClick={() => onPage(data.page + 1)}
          >
            {c.next}
          </Button>
        </div>
      </div>
    </>
  )
}
