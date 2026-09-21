import type { CodexReviewVersion } from '../../../../shared/codex-review-types'
import { Badge } from '../ui/badge'
import { reviewCopy } from './review-copy'

export function CodexReviewCoverage({
  version
}: {
  version: CodexReviewVersion
}): React.JSX.Element {
  const c = reviewCopy()
  return (
    <details className="space-y-4 border-t border-border pt-4">
      <summary className="cursor-pointer text-sm font-medium">
        {c.linked} · {version.audit.filesRead}/{version.audit.candidateFiles} {c.sources}
      </summary>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        {[
          [c.context, version.audit.counts.context],
          [c.requests, version.audit.counts.request],
          [c.tools, version.audit.counts.tool],
          [c.unreturned, version.audit.counts.tool - version.audit.toolResults],
          [c.readFailures, version.audit.failedFiles],
          [c.damaged, version.audit.malformedLines],
          [c.conflicts, version.audit.conflictingRecords ?? 0]
        ].map(([label, count]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{count}</dd>
          </div>
        ))}
      </dl>
      {version.audit.truncatedFiles > 0 && <Badge variant="outline">{c.truncated}</Badge>}
      <p className="text-xs text-muted-foreground">{c.coverage}</p>
      <p className="text-xs text-muted-foreground">
        {c.pendingEvidence} · {c.notLinked}
      </p>
      {version.audit.sources?.map((source) => (
        <p key={source.path} className="break-all font-mono text-xs text-muted-foreground">
          {source.path}
          <br />
          {source.start}–{source.end} · {source.sha256.slice(0, 12)}
        </p>
      ))}
    </details>
  )
}
