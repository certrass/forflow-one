import type { CodexReviewVersion } from '../../../../shared/codex-review-types'
import { Badge } from '../ui/badge'
import { reviewCopy } from './review-copy'
import { conversationReviewCopy } from './conversation-review-copy'

export function CodexReviewCoverage({
  version
}: {
  version: CodexReviewVersion
}): React.JSX.Element {
  const c = reviewCopy()
  const s = conversationReviewCopy()
  return (
    <details className="space-y-4 border-t border-border pt-4" data-testid="review-coverage">
      <summary className="cursor-pointer text-sm font-medium">
        {c.linked} · {version.audit.filesRead}/{version.audit.candidateFiles} {c.sources}
      </summary>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        {[
          [c.context, version.audit.counts.context],
          [s.userMessages, version.audit.messageCounts?.user ?? c.unknown],
          [s.assistantMessages, version.audit.messageCounts?.assistant ?? c.unknown],
          [c.requests, version.audit.counts.request],
          [c.tools, version.audit.counts.tool],
          [c.unreturned, version.audit.counts.tool - version.audit.toolResults],
          [c.readFailures, version.audit.failedFiles],
          [c.damaged, version.audit.malformedLines],
          [c.conflicts, version.audit.conflictingRecords ?? c.unknown],
          [s.omittedRows, version.audit.omittedRows ?? c.unknown],
          [s.incompleteLines, version.audit.incompleteLines ?? c.unknown],
          [s.unreadSources, version.audit.unreadSources?.length ?? c.unknown]
        ].map(([label, count]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{count}</dd>
          </div>
        ))}
      </dl>
      {version.audit.truncatedFiles > 0 && <Badge variant="outline">{c.truncated}</Badge>}
      <p className="text-xs text-muted-foreground">{c.coverage}</p>
      <p className="text-xs text-muted-foreground">{s.coverageNote}</p>
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
      {version.audit.unreadSources?.map((source) => (
        <p key={source.path} className="break-all text-xs text-muted-foreground">
          {source.reason === 'file_limit' ? s.fileLimit : s.readFailed}
          <br />
          <span className="font-mono">{source.path}</span>
        </p>
      ))}
    </details>
  )
}
