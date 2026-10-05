import { useEffect, useState } from 'react'
import type { CodexAnalyticsResult } from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { reviewCopy } from './review-copy'
import { workspaceReviewCopy } from './workspace-review-copy'

export function WorkspaceReviewSessions({
  selected,
  disabled,
  onChange
}: {
  selected: string[]
  disabled: boolean
  onChange: (ids: string[]) => void
}): React.JSX.Element {
  const c = workspaceReviewCopy()
  const r = reviewCopy()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<CodexAnalyticsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    setResult(null)
    const timer = setTimeout(() => {
      const read = window.api?.codexUsage?.getAnalytics
      if (!read) {
        setError(r.unavailable)
        return
      }
      void read({
        scope: 'all',
        range: 'all',
        search,
        project: '',
        order: 'recent',
        page,
        pageSize: 10
      })
        .then((value) => {
          if (active) {
            setResult(value)
            setError(null)
          }
        })
        .catch((reason: unknown) => {
          if (active) {
            setError(reason instanceof Error ? reason.message : r.error)
          }
        })
    }, 150)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search, page, r.error, r.unavailable])
  const toggle = (id: string): void =>
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id])
  return (
    <section className="space-y-3">
      <p className="text-xs text-muted-foreground">{c.sessionNote}</p>
      <Input
        aria-label={c.searchSessions}
        placeholder={c.searchSessions}
        value={search}
        disabled={disabled}
        onChange={(event) => {
          setSearch(event.target.value)
          setPage(1)
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {selected.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {c.selected} · {selected.length}/12
          </p>
          {selected.map((id) => (
            <div key={id} className="flex items-center justify-between gap-2 text-xs">
              <span className="break-all font-mono">{id}</span>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={disabled}
                aria-label={`${c.remove} ${id}`}
                onClick={() => toggle(id)}
              >
                {c.remove}
              </Button>
            </div>
          ))}
        </div>
      )}
      {!result && !error && (
        <p role="status" className="text-xs text-muted-foreground">
          {r.loading}
        </p>
      )}
      {result?.rows.map((row) => (
        <label
          key={row.sessionId}
          className="flex items-start gap-3 border-b border-border py-2 text-sm"
        >
          <Checkbox
            checked={selected.includes(row.sessionId)}
            disabled={disabled || (!selected.includes(row.sessionId) && selected.length >= 12)}
            onCheckedChange={() => toggle(row.sessionId)}
          />
          <span className="min-w-0 space-y-1">
            <span className="block break-words">{row.title ?? row.sessionId}</span>
            <span className="block break-all text-xs text-muted-foreground">
              {row.projectLabels.join(' · ')} · {row.sessionId}
            </span>
          </span>
        </label>
      ))}
      {result?.rows.length === 0 && <p className="text-xs text-muted-foreground">{c.noSessions}</p>}
      {result && result.total > 10 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled || page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {r.previous}
          </Button>
          <span className="text-xs">
            {page}/{Math.ceil(result.total / 10)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled || page * 10 >= result.total}
            onClick={() => setPage(page + 1)}
          >
            {r.next}
          </Button>
        </div>
      )}
    </section>
  )
}
