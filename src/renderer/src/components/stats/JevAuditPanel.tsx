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
import { JevDeliveryWorkflow } from './JevDeliveryWorkflow'
import { JevRecordInput } from './JevRecordInput'
import { jevGuideCopy } from './jev-guide-copy'

export function JevAuditPanel({
  active = true,
  review,
  version,
  readOnly,
  onUpdated,
  initialEvidenceKey,
  receipts,
  onReceipt,
  onBusyChange,
  onLocate,
  onIssues,
  onEditGoal,
  onEditSources,
  onReread
}: {
  active?: boolean
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
  onEditGoal?: () => void
  onEditSources?: () => void
  onReread?: () => void
}): React.JSX.Element {
  const c = jevAuditCopy()
  const w = reviewWorkspaceCopy()
  const d = jevDeliveryCopy()
  const g = jevGuideCopy()
  const api = window.api?.forflowJevAudit
  const [chosenMode, setMode] = useState<string | undefined>(
    initialEvidenceKey ? 'record' : undefined
  )
  const first = version.audit.rows.find((row) => row.kind === 'tool') ?? version.audit.rows[0]
  const [selected, setSelected] = useState(
    initialEvidenceKey ??
      (first
        ? codexEvidenceKey(first)
        : (version.workspace?.files.find((file) => file.status === 'read')?.evidenceKey ?? ''))
  )
  const [claim, setClaim] = useState('')
  const [preview, setPreview] = useState<JevPreview | null>(null)
  const [busyText, setBusyText] = useState<string | null>(null)
  const busy = busyText !== null
  const inFlight = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const currentReceipts = receipts.filter((receipt) => receipt.versionId === version.id)
  const mode =
    chosenMode ??
    (currentReceipts.length && currentReceipts.at(-1)?.mode !== 'delivery' ? 'record' : 'delivery')
  const currentPreview =
    preview?.reviewId === review.id && preview.versionId === version.id ? preview : null
  const perform = async (label: string, operation: () => Promise<void>): Promise<boolean> => {
    if (inFlight.current || readOnly) {
      return false
    }
    inFlight.current = true
    setBusyText(label)
    onBusyChange?.(true)
    setError(null)
    try {
      await operation()
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : c.error)
      return false
    } finally {
      inFlight.current = false
      setBusyText(null)
      onBusyChange?.(false)
    }
  }
  if (!api) {
    return <p className="text-sm text-muted-foreground">{c.unavailable}</p>
  }
  const send = (): Promise<boolean> =>
    perform(g.sending, async () => {
      if (!currentPreview) {
        throw new Error(c.error)
      }
      const receipt = await api.run({ id: currentPreview.id, inputHash: currentPreview.inputHash })
      onReceipt(receipt)
      setPreview(null)
    })
  const renderResults = (
    resultMode: 'delivery' | 'record',
    onRecheck?: () => void
  ): React.JSX.Element => (
    <JevAuditResults
      receipts={currentReceipts.filter((receipt) =>
        resultMode === 'delivery' ? receipt.mode === 'delivery' : receipt.mode !== 'delivery'
      )}
      review={review}
      busy={busy}
      readOnly={readOnly}
      onLocate={onLocate}
      onIssues={onIssues}
      onRecheck={readOnly ? undefined : onRecheck}
      onAccept={(receiptId, question) =>
        void perform(g.recording, async () => {
          onUpdated(await api.accept({ receiptId, question, expectedRevision: review.revision }))
        })
      }
    />
  )
  return (
    <section className="space-y-4" data-testid="jev-audit-panel">
      <p className="text-sm text-muted-foreground">
        {mode === 'delivery' ? g.purpose : g.recordHint}
      </p>
      <details className="space-y-3">
        <summary className="cursor-pointer text-sm text-muted-foreground">{g.account}</summary>
        <JevAccountSection />
      </details>
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
        <TabsContent value="delivery" forceMount className="data-[state=inactive]:hidden">
          <JevDeliveryWorkflow
            key={version.id}
            version={version}
            active={active && mode === 'delivery'}
            busy={busy}
            readOnly={readOnly}
            preview={currentPreview}
            hasResults={currentReceipts.some((receipt) => receipt.mode === 'delivery')}
            onEditGoal={onEditGoal}
            onEditSources={onEditSources}
            onReread={onReread}
            onLocate={onLocate}
            onDiscard={() => {
              setMode('delivery')
              setPreview(null)
            }}
            onPrepare={(evidenceKeys, handoffEvidenceKeys) =>
              perform(g.preparing, async () => {
                setPreview(null)
                setPreview(
                  await api.prepare({
                    mode: 'delivery',
                    reviewId: review.id,
                    versionId: version.id,
                    evidenceKeys,
                    handoffEvidenceKeys
                  })
                )
              })
            }
            onSend={send}
            renderResults={(onRecheck) => renderResults('delivery', onRecheck)}
          />
        </TabsContent>
        <TabsContent value="record">
          <div className="space-y-4">
            {!readOnly && (
              <>
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
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !selected}
                  onClick={() =>
                    void perform(g.preparing, async () => {
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
                {currentPreview && (
                  <div className="space-y-3 rounded-md border border-border p-3">
                    <h4 className="text-sm font-medium">{c.preview}</h4>
                    <p className="text-sm text-muted-foreground">{c.external}</p>
                    <JevRequestPreview body={currentPreview.body} />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={busy} onClick={() => void send()}>
                        {c.send}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setPreview(null)}
                      >
                        {c.cancel}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            {renderResults('record')}
          </div>
        </TabsContent>
      </Tabs>
      {busyText && (
        <p role="status" className="text-sm text-muted-foreground">
          {busyText}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {onIssues && (
        <Button size="sm" variant="outline" disabled={busy} onClick={onIssues}>
          {w.goIssues}
        </Button>
      )}
    </section>
  )
}
