import { useEffect, useRef, useState } from 'react'
import {
  codexEvidenceKey,
  type CodexReview,
  type CodexReviewVersion
} from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { reviewCopy } from './review-copy'
import { reviewWorkspaceCopy } from './review-workspace-copy'
import { conversationReviewCopy, conversationRecordLabel } from './conversation-review-copy'
import { formatSessionTime } from './usage-formatters'

export function CodexReviewEvidence({
  review,
  version,
  onFlag,
  readOnly,
  locateKey,
  onAudit
}: {
  locateKey: string | null
  review: CodexReview
  version: CodexReviewVersion
  onFlag: (key: string) => void
  readOnly: boolean
  onAudit?: (key: string) => void
}): React.JSX.Element {
  const c = reviewCopy()
  const w = reviewWorkspaceCopy()
  const s = conversationReviewCopy()
  const located = useRef<HTMLTableRowElement | null>(null)
  const [page, setPage] = useState(
    Math.max(
      1,
      Math.floor(version.audit.rows.findIndex((row) => codexEvidenceKey(row) === locateKey) / 20) +
        1
    )
  )
  const [excerpt, setExcerpt] = useState<{
    text: string
    truncated: boolean
    sourcePath: string
    byteOffset: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const rows = version.audit.rows.slice((page - 1) * 20, page * 20)
  useEffect(() => {
    located.current?.scrollIntoView({ block: 'nearest' })
  }, [locateKey, page])
  const read = async (evidenceKey: string, part: 'record' | 'result' = 'record'): Promise<void> => {
    setLoading(true)
    setExcerpt(null)
    setError(null)
    try {
      const fn = window.api?.codexUsage?.readReviewEvidence
      if (!fn) {
        throw new Error(c.unavailable)
      }
      setExcerpt(await fn({ id: review.id, versionId: version.id, evidenceKey, part }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : c.error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-3" data-testid="review-records">
      <p className="text-xs text-muted-foreground">{c.coverage}</p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {excerpt && (
        <section className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{c.redacted}</span>
            <Button variant="ghost" size="xs" onClick={() => setExcerpt(null)}>
              {c.close}
            </Button>
          </div>
          <p className="break-all font-mono text-xs">
            {excerpt.sourcePath}:{excerpt.byteOffset}
          </p>
          <pre className="max-h-64 overflow-auto scrollbar-sleek whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-xs">
            {excerpt.text}
          </pre>
          {excerpt.truncated && (
            <p className="text-xs text-muted-foreground">{c.excerptTruncated}</p>
          )}
        </section>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 font-medium">{c.records}</th>
              <th className="px-2 py-2 font-medium">{c.result}</th>
              <th className="py-2 font-medium">{c.source}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={codexEvidenceKey(row)}
                ref={codexEvidenceKey(row) === locateKey ? located : undefined}
                data-current={codexEvidenceKey(row) === locateKey}
                className="border-b border-border/60 align-top data-[current=true]:bg-accent"
              >
                <td className="max-w-64 py-3">
                  <p className="font-medium">{conversationRecordLabel(row, s) ?? row.name}</p>
                  {row.kind === 'context' && !row.recordFormat && (
                    <p className="text-xs text-muted-foreground">
                      {s.recordType}: {c.unknown}
                    </p>
                  )}
                  {row.recordFormat === 'turn_context' && (
                    <p className="text-xs text-muted-foreground">{row.name}</p>
                  )}
                  {row.recordFormat === 'compaction' && (
                    <p className="text-xs text-muted-foreground">{s.summaryNote}</p>
                  )}
                  {row.recordFormat === 'response_message' && (
                    <p className="text-xs text-muted-foreground">
                      {s.textChars}: {row.messageTextChars ?? c.unknown} · {s.unsupportedBlocks}:{' '}
                      {row.unsupportedContentBlocks ?? c.unknown}
                    </p>
                  )}
                  {row.recordFormat === 'response_message' && row.messageTextChars === 0 && (
                    <p className="text-xs text-muted-foreground">{s.noText}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatSessionTime(row.timestamp)}
                  </p>
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {row.recordId}
                  </p>
                </td>
                <td className="px-2 py-3 text-xs">
                  {row.kind === 'tool'
                    ? row.hasResult
                      ? c.found
                      : c.notObserved
                    : row.tokens === null
                      ? '—'
                      : `${row.tokens.toLocaleString()} tokens`}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    {onAudit && (
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={readOnly || loading}
                        onClick={() => onAudit(codexEvidenceKey(row))}
                      >
                        {w.inspect}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={loading}
                      onClick={() => void read(codexEvidenceKey(row))}
                    >
                      {c.viewSource}
                    </Button>
                    {row.resultSource && (
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={loading}
                        onClick={() => void read(codexEvidenceKey(row), 'result')}
                      >
                        {c.viewResult}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={readOnly}
                      onClick={() => onFlag(codexEvidenceKey(row))}
                    >
                      {c.flag}
                    </Button>
                  </div>
                  <p
                    className="mt-1 max-w-64 truncate font-mono text-xs text-muted-foreground"
                    title={`${row.sourcePath}:${row.byteOffset}`}
                  >
                    {row.sourcePath}:{row.byteOffset}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="py-4 text-sm text-muted-foreground">{c.noRecords}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          {c.previous}
        </Button>
        <span className="py-1 text-xs text-muted-foreground">
          {page} / {Math.max(1, Math.ceil(version.audit.rows.length / 20))}
        </span>
        <Button
          variant="ghost"
          size="xs"
          disabled={page * 20 >= version.audit.rows.length}
          onClick={() => setPage(page + 1)}
        >
          {c.next}
        </Button>
      </div>
    </div>
  )
}
