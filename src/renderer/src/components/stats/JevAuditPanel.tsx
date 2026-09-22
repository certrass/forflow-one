import { useRef, useState } from 'react'
import {
  codexEvidenceKey,
  type CodexReview,
  type CodexReviewVersion
} from '../../../../shared/codex-review-types'
import type { JevPreview, JevReceipt } from '../../../../shared/jev-audit-types'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { JevAccountSection } from '../settings/JevAccountSection'
import { JevAuditResults } from './JevAuditResults'
import { jevAuditCopy } from './jev-audit-copy'
import { JevRequestPreview } from './JevRequestPreview'
import { reviewWorkspaceCopy } from './review-workspace-copy'
import { jevDeliveryCopy } from './jev-delivery-copy'
import { JevDeliveryInput } from './JevDeliveryInput'
import { JevRecordInput } from './JevRecordInput'

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
  const d = jevDeliveryCopy()
  const api = window.api?.forflowJevAudit
  const [mode, setMode] = useState(initialEvidenceKey ? 'record' : 'delivery')
  const [evidenceKeys, setEvidenceKeys] = useState<string[]>(
    initialEvidenceKey ? [initialEvidenceKey] : []
  )
  const [handoffEvidenceKeys, setHandoffEvidenceKeys] = useState<string[]>([])
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
  const inFlight = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const perform = async (operation: () => Promise<void>): Promise<void> => {
    if (inFlight.current || readOnly) {
      return
    }
    inFlight.current = true
    setBusy(true)
    onBusyChange?.(true)
    setError(null)
    try {
      await operation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : c.error)
    } finally {
      inFlight.current = false
      setBusy(false)
      onBusyChange?.(false)
    }
  }
  if (!api) {
    return <p className="text-sm text-muted-foreground">{c.unavailable}</p>
  }
  return (
    <section className="space-y-4" data-testid="jev-audit-panel">
      <p className="text-sm text-muted-foreground">{mode === 'delivery' ? d.scope : c.scope}</p>
      <JevAccountSection />
      {!readOnly && (
        <>
          <Tabs
            value={mode}
            onValueChange={(value) => {
              setMode(value)
              setPreview(null)
            }}
          >
            <TabsList aria-label={d.mode}>
              <TabsTrigger value="delivery" disabled={busy}>
                {d.delivery}
              </TabsTrigger>
              <TabsTrigger value="record" disabled={busy}>
                {d.record}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="delivery">
              <JevDeliveryInput
                version={version}
                evidenceKeys={evidenceKeys}
                handoffEvidenceKeys={handoffEvidenceKeys}
                busy={busy}
                onLocate={onLocate}
                onChange={(keys, handoff) => {
                  setEvidenceKeys(keys)
                  setHandoffEvidenceKeys(handoff)
                  setPreview(null)
                }}
              />
            </TabsContent>
            <TabsContent value="record">
              <JevRecordInput
                version={version}
                selected={selected}
                claim={claim}
                busy={busy}
                onSelect={(key) => {
                  setSelected(key)
                  setPreview(null)
                }}
                onClaim={(value) => {
                  setClaim(value)
                  setPreview(null)
                }}
              />
            </TabsContent>
          </Tabs>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || (mode === 'delivery' ? evidenceKeys.length === 0 : !selected)}
            onClick={() =>
              void perform(async () => {
                setPreview(null)
                setPreview(
                  await api.prepare(
                    mode === 'delivery'
                      ? {
                          mode: 'delivery',
                          reviewId: review.id,
                          versionId: version.id,
                          evidenceKeys,
                          handoffEvidenceKeys
                        }
                      : {
                          reviewId: review.id,
                          versionId: version.id,
                          evidenceKey: selected,
                          claim
                        }
                  )
                )
              })
            }
          >
            {c.prepare}
          </Button>
          {preview && preview.reviewId === review.id && preview.versionId === version.id && (
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
