import { useState } from 'react'
import type { CodexReview, CodexReviewMutation } from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { reviewCopy } from './review-copy'
import { reviewWorkspaceCopy } from './review-workspace-copy'
import { CodexReviewChanges } from './CodexReviewChanges'
import { CodexReviewEvidence } from './CodexReviewEvidence'
import { CodexReviewFindings } from './CodexReviewFindings'
import { CodexReviewHeader } from './CodexReviewHeader'
import { CodexReviewActivity } from './CodexReviewActivity'
import { CodexReviewCoverage } from './CodexReviewCoverage'
import { summarizeReviewChecks } from './codex-review-activity'
import { useJevReviewChecks } from './use-jev-review-checks'
import { JevAuditPanel } from './JevAuditPanel'

export function CodexReviewWorkspace({
  initial,
  onBack
}: {
  initial: CodexReview
  onBack: () => void
}): React.JSX.Element {
  const c = reviewCopy()
  const w = reviewWorkspaceCopy()
  const [review, setReview] = useState(initial)
  const [selected, setSelected] = useState(initial.versions.length - 1)
  const [tab, setTab] = useState('overview')
  const [focus, setFocus] = useState(initial.versions.at(-1)?.focus ?? c.defaultFocus)
  const [locateKey, setLocateKey] = useState<string | null>(null)
  const [evidenceKey, setEvidenceKey] = useState<string | null>(null)
  const [jevEvidenceKey, setJevEvidenceKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { receipts, failed, refresh, record } = useJevReviewChecks(review.id)
  const version = review.versions[selected] ?? review.versions.at(-1)
  const previous = review.versions[selected - 1]
  const readOnly = selected !== review.versions.length - 1
  const locked = busy || checking
  const focusChanged = !focus.trim() || focus.trim() !== version.focus
  const checks = summarizeReviewChecks(receipts, version.id)
  const chooseVersion = (index: number): void => {
    setSelected(index)
    setEvidenceKey(null)
    setLocateKey(null)
    setJevEvidenceKey(null)
  }
  const navigate = (versionId: string, nextTab: string, key: string | null = null): void => {
    const index = review.versions.findIndex((entry) => entry.id === versionId)
    if (index === -1) {
      return
    }
    chooseVersion(index)
    setLocateKey(key)
    setTab(nextTab)
  }
  const apply = async (operation: () => Promise<CodexReview>): Promise<boolean> => {
    if (locked) {
      return false
    }
    setBusy(true)
    setError(null)
    try {
      const value = await operation()
      setReview(value)
      setSelected(value.versions.length - 1)
      setEvidenceKey(null)
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : c.error)
      return false
    } finally {
      setBusy(false)
    }
  }
  const mutate = (action: CodexReviewMutation['action']): Promise<boolean> =>
    apply(async () => {
      const update = window.api?.codexUsage?.updateReview
      if (!update) {
        throw new Error(c.unavailable)
      }
      return update({
        id: review.id,
        expectedRevision: review.revision,
        versionId: version.id,
        action
      })
    })
  const reread = (): Promise<boolean> =>
    apply(async () => {
      const open = window.api?.codexUsage?.openReview
      if (!open) {
        throw new Error(c.unavailable)
      }
      return open({
        sessionId: review.sessionId,
        scope: review.scope,
        range: review.range,
        focus,
        expectedRevision: review.revision
      })
    })
  return (
    <section className="min-w-0 space-y-6" data-testid="codex-review">
      <CodexReviewHeader
        review={review}
        version={version}
        selected={selected}
        busy={locked}
        readOnly={readOnly}
        focusChanged={focusChanged}
        receipts={receipts}
        onBack={onBack}
        onVersion={chooseVersion}
        onOverview={() => setTab('overview')}
        onChecks={() => setTab('jev')}
        onReread={() => void reread()}
        onConfirm={() => void mutate({ type: 'confirm' })}
      />
      {readOnly && <p className="text-xs text-muted-foreground">{c.historic}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="max-w-full overflow-x-auto">
          <TabsTrigger value="overview" disabled={locked}>
            {w.overview}
          </TabsTrigger>
          <TabsTrigger value="issues" disabled={locked}>
            {c.issues} ({review.issues.filter((issue) => issue.status === 'open').length})
          </TabsTrigger>
          <TabsTrigger value="changes" disabled={locked}>
            {c.changes}
          </TabsTrigger>
          <TabsTrigger value="records" disabled={locked}>
            {c.records}
          </TabsTrigger>
          {window.api?.forflowJevAudit && (
            <TabsTrigger value="jev" disabled={locked}>
              Jev · Beta
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="overview">
          <div className="space-y-6 pt-3">
            <section className="space-y-3 border-b border-border pb-5">
              <h4 className="text-base font-medium">{w.description}</h4>
              <p className="whitespace-pre-wrap break-words text-sm">{version.focus}</p>
              {!readOnly && (
                <details className="space-y-3">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    {c.focus}
                  </summary>
                  <Label htmlFor="codex-review-focus">{c.focus}</Label>
                  <Textarea
                    id="codex-review-focus"
                    value={focus}
                    disabled={locked}
                    maxLength={2000}
                    onChange={(event) => setFocus(event.target.value)}
                  />
                </details>
              )}
            </section>
            <section
              className="space-y-3 border-b border-border pb-5"
              data-testid="review-check-summary"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-base font-medium">{w.checks}</h4>
                <Button variant="outline" size="sm" disabled={locked} onClick={() => setTab('jev')}>
                  {w.viewChecks}
                </Button>
              </div>
              {failed ? (
                <div className="flex items-center gap-3">
                  <p role="alert" className="text-sm text-destructive">
                    {w.checkError}
                  </p>
                  <Button variant="ghost" size="sm" onClick={refresh}>
                    {c.refresh}
                  </Button>
                </div>
              ) : (
                <p className="text-sm">
                  {checks.total
                    ? `${w.checked} ${checks.completed} · ${w.attention} ${checks.attention} · ${w.incomplete} ${checks.incomplete}`
                    : w.noChecks}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{w.checkScope}</p>
            </section>
            <CodexReviewActivity
              review={review}
              receipts={receipts}
              busy={locked}
              readOnly={readOnly}
              mutate={mutate}
              onLocate={(id, key) => navigate(id, 'records', key)}
              onVersion={(id) => navigate(id, 'changes')}
              onChecks={(id) => navigate(id, 'jev')}
            />
          </div>
        </TabsContent>
        <TabsContent value="issues">
          <CodexReviewFindings
            review={review}
            evidenceKey={evidenceKey}
            busy={locked}
            readOnly={readOnly}
            mutate={mutate}
            onLocate={(id, key) => navigate(id, 'records', key)}
            onClearEvidence={() => setEvidenceKey(null)}
          />
        </TabsContent>
        <TabsContent value="changes">
          <CodexReviewChanges previous={previous} current={version} />
        </TabsContent>
        <TabsContent value="jev">
          <JevAuditPanel
            key={`${version.id}:${jevEvidenceKey}`}
            review={review}
            version={version}
            readOnly={readOnly || busy || focusChanged}
            initialEvidenceKey={jevEvidenceKey}
            receipts={receipts}
            onReceipt={record}
            onBusyChange={setChecking}
            onUpdated={setReview}
            onLocate={(key) => navigate(version.id, 'records', key)}
            onIssues={() => setTab('issues')}
          />
        </TabsContent>
        <TabsContent value="records">
          <CodexReviewEvidence
            key={`${version.id}:${locateKey}`}
            review={review}
            version={version}
            locateKey={locateKey}
            readOnly={readOnly || locked}
            onFlag={(key) => {
              setEvidenceKey(key)
              setTab('issues')
            }}
            onAudit={
              window.api?.forflowJevAudit && !focusChanged
                ? (key) => {
                    setJevEvidenceKey(key)
                    setTab('jev')
                  }
                : undefined
            }
          />
        </TabsContent>
      </Tabs>
      <CodexReviewCoverage version={version} />
      <p className="text-xs text-muted-foreground">{w.local}</p>
    </section>
  )
}
