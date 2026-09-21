import { useId, useState } from 'react'
import {
  codexEvidenceKey,
  type CodexReview,
  type CodexReviewVersion
} from '../../../../shared/codex-review-types'
import type { JevPreview, JevReceipt } from '../../../../shared/jev-audit-types'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { JevAccountSection } from '../settings/JevAccountSection'
import { JevAuditResults } from './JevAuditResults'
import { jevAuditCopy } from './jev-audit-copy'
import { JevRequestPreview } from './JevRequestPreview'
import { reviewWorkspaceCopy } from './review-workspace-copy'

export function JevAuditPanel({
  review,
  version,
  readOnly,
  onUpdated,
  initialEvidenceKey,
  receipts,
  onReceipt,
  onBusyChange,
  onLocate,
  onIssues
}: {
  review: CodexReview
  version: CodexReviewVersion
  readOnly: boolean
  onUpdated: (review: CodexReview) => void
  initialEvidenceKey?: string | null
  receipts: JevReceipt[]
  onReceipt: (receipt: JevReceipt) => void
  onBusyChange?: (busy: boolean) => void
  onLocate?: (key: string) => void
  onIssues?: () => void
}): React.JSX.Element {
  const c = jevAuditCopy()
  const w = reviewWorkspaceCopy()
  const id = useId()
  const api = window.api?.forflowJevAudit
  const first = version.audit.rows.find((row) => row.kind === 'tool') ?? version.audit.rows[0]
  const [selected, setSelected] = useState(
    initialEvidenceKey ??
      (first
        ? codexEvidenceKey(first)
        : (version.workspace?.files.find((file) => file.status === 'read')?.evidenceKey ?? ''))
  )
  const [claim, setClaim] = useState('')
  const [preview, setPreview] = useState<JevPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const perform = async (operation: () => Promise<void>): Promise<void> => {
    if (busy) {
      return
    }
    setBusy(true)
    onBusyChange?.(true)
    setError(null)
    try {
      await operation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : c.error)
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }
  if (!api) {
    return <p className="text-sm text-muted-foreground">{c.unavailable}</p>
  }
  return (
    <section className="space-y-4" data-testid="jev-audit-panel">
      <p className="text-sm text-muted-foreground">{c.scope}</p>
      <JevAccountSection />
      {!readOnly && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${id}-record`}>{c.record}</Label>
            <Select
              value={selected}
              disabled={busy}
              onValueChange={(key) => {
                setSelected(key)
                setPreview(null)
              }}
            >
              <SelectTrigger id={`${id}-record`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {version.workspace?.files
                  .filter((file) => file.status === 'read')
                  .map((file) => (
                    <SelectItem key={file.evidenceKey} value={file.evidenceKey}>
                      {file.path}
                    </SelectItem>
                  ))}
                {version.audit.rows.map((row) => (
                  <SelectItem key={codexEvidenceKey(row)} value={codexEvidenceKey(row)}>
                    {row.name} · {new Date(row.timestamp).toLocaleString()} · {row.byteOffset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-claim`}>{c.claim}</Label>
            <Textarea
              id={`${id}-claim`}
              value={claim}
              disabled={busy}
              maxLength={2000}
              placeholder={c.claimHint}
              onChange={(event) => {
                setClaim(event.target.value)
                setPreview(null)
              }}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !selected}
            onClick={() =>
              void perform(async () => {
                setPreview(null)
                setPreview(
                  await api.prepare({
                    reviewId: review.id,
                    versionId: version.id,
                    evidenceKey: selected,
                    claim
                  })
                )
              })
            }
          >
            {c.prepare}
          </Button>
          {preview && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <h4 className="text-sm font-medium">{c.preview}</h4>
              <p className="text-sm text-muted-foreground">{c.external}</p>
              <JevRequestPreview body={preview.body} />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      const receipt = await api.run({
                        id: preview.id,
                        inputHash: preview.inputHash
                      })
                      onReceipt(receipt)
                      setPreview(null)
                    })
                  }
                >
                  {c.send}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPreview(null)}>
                  {c.cancel}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          {c.busy}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <JevAuditResults
        receipts={receipts.filter((receipt) => receipt.versionId === version.id)}
        review={review}
        busy={busy}
        readOnly={readOnly}
        onLocate={onLocate}
        onAccept={(receiptId, question) =>
          void perform(async () => {
            onUpdated(await api.accept({ receiptId, question, expectedRevision: review.revision }))
          })
        }
      />
      {onIssues && review.issues.length > 0 && (
        <Button size="sm" variant="outline" disabled={busy} onClick={onIssues}>
          {w.goIssues}
        </Button>
      )}
    </section>
  )
}
