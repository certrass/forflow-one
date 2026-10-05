import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAppStore } from '../../store'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { usageWorkspaceCopy } from './usage-workspace-copy'
import { formatTokens } from './usage-formatters'

export function CodexAnalyticsBreakdown(): React.JSX.Element {
  const c = usageWorkspaceCopy()
  const models = useAppStore((s) => s.codexUsageModelBreakdown)
  const projects = useAppStore((s) => s.codexUsageProjectBreakdown)
  const [group, setGroup] = useState('model')
  const [expanded, setExpanded] = useState(false)
  const rows = group === 'model' ? models : projects
  const total = rows.reduce((sum, row) => sum + row.totalTokens, 0)
  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-medium">{c.breakdown}</h3>
            <p className="text-sm text-muted-foreground">{c.breakdownDescription}</p>
          </div>
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger size="sm" aria-label={c.breakdown}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="model">{c.byModel}</SelectItem>
              <SelectItem value="project">{c.byProject}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex justify-between gap-4 border-b border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
            <span>{group === 'model' ? c.byModel : c.byProject}</span>
            <span>{c.proportion}</span>
          </div>
          {(expanded ? rows : rows.slice(0, 5)).map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 text-sm last:border-0"
            >
              <span className="min-w-0 truncate" title={row.label}>
                {row.label}
              </span>
              <span className="flex shrink-0 gap-6 tabular-nums">
                <span className="text-muted-foreground">{formatTokens(row.totalTokens)}</span>
                <span className="w-14 text-right">
                  {total
                    ? ((row.totalTokens / total) * 100).toLocaleString(undefined, {
                        maximumFractionDigits: 1
                      })
                    : 0}
                  %
                </span>
              </span>
            </div>
          ))}
          {!rows.length && <p className="p-5 text-sm text-muted-foreground">{c.chartEmpty}</p>}
        </div>
        {rows.length > 5 && (
          <Button variant="secondary" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? c.showLess : c.showMore}
          </Button>
        )}
      </section>
      <section className="rounded-xl border border-border">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              {c.coverage}
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <dl className="space-y-4 border-t border-border px-5 py-4">
              {[
                [c.localRecords, c.connected],
                [c.planHistory, c.currentOnly],
                [c.toolsAndSkills, c.fragmentsOnly]
              ].map(([label, detail]) => (
                <div key={label} className="grid gap-1 text-xs sm:grid-cols-2 sm:gap-4">
                  <dt>{label}</dt>
                  <dd className="text-muted-foreground">{detail}</dd>
                </div>
              ))}
            </dl>
          </CollapsibleContent>
        </Collapsible>
      </section>
    </>
  )
}
