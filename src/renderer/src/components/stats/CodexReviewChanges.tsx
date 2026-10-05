import { codexEvidenceKey, type CodexReviewVersion } from '../../../../shared/codex-review-types'
import { compareCodexReviewVersions } from '../../../../shared/codex-review-comparison'
import { reviewCopy } from './review-copy'

export function CodexReviewChanges({
  previous,
  current,
  showFocus = true
}: {
  previous?: CodexReviewVersion
  current: CodexReviewVersion
  showFocus?: boolean
}): React.JSX.Element {
  const c = reviewCopy()
  if (!previous) {
    return <p className="py-3 text-sm text-muted-foreground">{c.noChanges}</p>
  }
  const changes = compareCodexReviewVersions(previous, current)
  const rows = new Map(
    [...previous.audit.rows, ...current.audit.rows].map((row) => [codexEvidenceKey(row), row])
  )
  const groups = [
    { label: c.added, keys: changes.added },
    { label: c.removed, keys: changes.removed },
    { label: c.changed, keys: changes.changed }
  ]
  return (
    <div className="space-y-4 py-3">
      <p className="text-xs text-muted-foreground">{c.changesNote}</p>
      <dl className="grid grid-cols-2 gap-3">
        {(previous.usage || current.usage) && (
          <div>
            <dt className="text-xs text-muted-foreground">{c.tokens}</dt>
            <dd className="text-sm tabular-nums">
              {previous.usage?.totalTokens ?? '—'} → {current.usage?.totalTokens ?? '—'}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted-foreground">{c.unchanged}</dt>
          <dd className="text-sm tabular-nums">{changes.unchanged.length}</dd>
        </div>
      </dl>
      {showFocus && previous.focus !== current.focus && (
        <section className="space-y-2 rounded-md border border-border p-3">
          <h4 className="text-sm font-medium">{c.focus}</h4>
          <p className="whitespace-pre-wrap text-xs text-muted-foreground">{previous.focus}</p>
          <p className="whitespace-pre-wrap text-sm">{current.focus}</p>
        </section>
      )}
      {groups.map((group) => (
        <section key={group.label} className="space-y-2">
          <h4 className="text-sm font-medium">
            {group.label} · {group.keys.length}
          </h4>
          <ul className="max-h-64 space-y-2 overflow-auto scrollbar-sleek">
            {group.keys.map((key) => {
              const row = rows.get(key)
              return (
                <li key={key} className="rounded-md border border-border p-3 text-xs">
                  <p>
                    {row?.name} · {row?.recordId ?? row?.timestamp}
                  </p>
                  <p className="break-all font-mono text-muted-foreground">
                    {row?.sourcePath}:{row?.byteOffset}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
