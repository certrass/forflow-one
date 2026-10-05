import { useEffect, useRef, useState } from 'react'
import type { CodexReview, CodexReviewVersion } from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { workspaceReviewCopy } from './workspace-review-copy'
import { reviewCopy } from './review-copy'
import { reviewWorkspaceCopy } from './review-workspace-copy'

export function WorkspaceReviewEvidence({
  review,
  version,
  locateKey,
  readOnly,
  onFlag,
  onAudit
}: {
  review: CodexReview
  version: CodexReviewVersion
  locateKey: string | null
  readOnly: boolean
  onFlag: (key: string) => void
  onAudit?: (key: string) => void
}): React.JSX.Element {
  const c = workspaceReviewCopy()
  const r = reviewCopy()
  const w = reviewWorkspaceCopy()
  const selected = useRef<HTMLLIElement | null>(null)
  const [excerpt, setExcerpt] = useState<{
    text: string
    truncated: boolean
    sourcePath: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const status = {
    read: c.read,
    missing: c.missing,
    unreadable: c.unreadable,
    too_large: c.tooLarge,
    binary: c.binary,
    unsafe: c.unsafe
  }
  useEffect(() => {
    selected.current?.scrollIntoView({ block: 'nearest' })
  }, [locateKey])
  const read = async (evidenceKey: string): Promise<void> => {
    setLoading(true)
    setExcerpt(null)
    setError(null)
    try {
      const readEvidence = window.api?.codexUsage?.readReviewEvidence
      if (!readEvidence) {
        throw new Error(c.unavailable)
      }
      setExcerpt(await readEvidence({ id: review.id, versionId: version.id, evidenceKey }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : r.error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <section className="space-y-4" data-testid="workspace-review-records">
      <p className="text-xs text-muted-foreground">{c.jevScope}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {excerpt && (
        <section className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{c.excerpt}</span>
            <Button variant="ghost" size="xs" onClick={() => setExcerpt(null)}>
              {r.close}
            </Button>
          </div>
          <p className="break-all font-mono text-xs">{excerpt.sourcePath}</p>
          <pre className="max-h-80 overflow-auto scrollbar-sleek whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-xs">
            {excerpt.text}
          </pre>
          {excerpt.truncated && (
            <p className="text-xs text-muted-foreground">{r.excerptTruncated}</p>
          )}
        </section>
      )}
      <ul className="space-y-3">
        {version.workspace?.files.map((file) => (
          <li
            key={file.evidenceKey}
            ref={file.evidenceKey === locateKey ? selected : undefined}
            data-current={file.evidenceKey === locateKey}
            className="space-y-3 rounded-md border border-border p-3 data-[current=true]:bg-accent"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="break-all font-mono text-sm">{file.path}</p>
              <Badge variant="outline">
                {c[file.kind]} · {status[file.status]}
              </Badge>
            </div>
            <p className="break-all font-mono text-xs text-muted-foreground">
              {c.hash}: {file.contentHash ?? c.unknown}
            </p>
            {file.reason && <p className="text-xs text-muted-foreground">{file.reason}</p>}
            {file.signals.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {c.signals}: {file.signals.length} · {c.flowUnknown} · {c.authorizationUnknown}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {onAudit && file.status === 'read' && (
                <Button
                  size="xs"
                  variant="outline"
                  disabled={readOnly || loading}
                  onClick={() => onAudit(file.evidenceKey)}
                >
                  {w.inspect}
                </Button>
              )}
              <Button
                size="xs"
                variant="outline"
                disabled={loading || file.status !== 'read'}
                onClick={() => void read(file.evidenceKey)}
              >
                {r.viewSource}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                disabled={readOnly}
                onClick={() => onFlag(file.evidenceKey)}
              >
                {r.flag}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
