import { useRef, useState } from 'react'
import type { CodexReview, CodexReviewMutation } from '../../../../shared/codex-review-types'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { reviewCopy } from './review-copy'
import { reviewWorkspaceCopy } from './review-workspace-copy'
import { CodexReviewChanges } from './CodexReviewChanges'
import { CodexReviewEvidence } from './CodexReviewEvidence'
import { CodexReviewFindings } from './CodexReviewFindings'
import { CodexReviewHeader } from './CodexReviewHeader'
import { CodexReviewGoal } from './CodexReviewGoal'
import { CodexReviewActivity } from './CodexReviewActivity'
import { CodexReviewCoverage } from './CodexReviewCoverage'
import { summarizeReviewChecks } from './codex-review-activity'
import { useJevReviewChecks } from './use-jev-review-checks'
import { JevAuditPanel } from './JevAuditPanel'
import { WorkspaceReviewIntake } from './WorkspaceReviewIntake'
import { WorkspaceReviewSummary } from './WorkspaceReviewSummary'
import { WorkspaceReviewEvidence } from './WorkspaceReviewEvidence'
import { WorkspaceReviewChanges } from './WorkspaceReviewChanges'
import { workspaceReviewCopy } from './workspace-review-copy'
import {
  WorkspaceReviewWalkthrough,
  useReviewWalkthroughAnchors
} from './WorkspaceReviewWalkthrough'

export function CodexReviewWorkspace({
  active = true,
  initial,
  onBack
}: {
  active?: boolean
  initial: CodexReview
  onBack: () => void
}): React.JSX.Element {
  const c = reviewCopy()
  const w = reviewWorkspaceCopy()
  const p = workspaceReviewCopy()
  const [review, setReview] = useState(initial)
  const [selected, setSelected] = useState(initial.versions.length - 1)
  const [tab, setTab] = useState('overview')
  const walkthroughAnchors = useReviewWalkthroughAnchors()
  const [focus, setFocus] = useState(initial.versions.at(-1)?.focus ?? c.defaultFocus)
  const [focusEditorOpen, setFocusEditorOpen] = useState(false)
  const focusRequested = useRef(false)
  const [locateKey, setLocateKey] = useState<string | null>(null)
  const [evidenceKey, setEvidenceKey] = useState<string | null>(null)
  const [jevEvidenceKey, setJevEvidenceKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [editingScope, setEditingScope] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { receipts, failed, refresh, record } = useJevReviewChecks(review.id)
  const version = review.versions[selected] ?? review.versions.at(-1)
  const previous = review.versions[selected - 1]
  const readOnly = selected !== review.versions.length - 1
  const locked = busy || checking
  const focusChanged = !focus.trim() || focus.trim() !== version.focus
  const checks = summarizeReviewChecks(receipts, version.id)
  const editGoal = (): void => {
    if (!active || locked || readOnly) {
      return
    }
    focusRequested.current = true
    setFocusEditorOpen(true)
    setTab('overview')
  }
  const chooseVersion = (index: number): void => {
    if (locked || index === selected) {
      return
    }
    setSelected(index)
    setFocusEditorOpen(false)
    setEvidenceKey(null)
    setLocateKey(null)
    setJevEvidenceKey(null)
  }
  const navigate = (versionId: string, nextTab: string, key: string | null = null): void => {
    const index = review.versions.findIndex((entry) => entry.id === versionId)
    if (locked || index === -1) {
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
      if (version.workspace) {
        const openWorkspace = window.api?.codexUsage?.openWorkspaceReview
        if (!openWorkspace) {
          throw new Error(p.unavailable)
        }
        return openWorkspace({
          workspaceId: version.workspace.target.id,
          selection: version.workspace.selection,
          focus,
          expectedRevision: review.revision
        })
      }
      const open = window.api?.codexUsage?.openReview
      if (!open || !review.sessionId) {
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
    <>
      {editingScope && (
        <WorkspaceReviewIntake
          active={active}
          initial={review}
          onCancel={() => setEditingScope(false)}
          onOpenReview={(value) => {
            setReview(value)
            setSelected(value.versions.length - 1)
            setFocus(value.versions.at(-1)?.focus ?? focus)
            setEvidenceKey(null)
            setLocateKey(null)
            setJevEvidenceKey(null)
            setFocusEditorOpen(false)
            setEditingScope(false)
          }}
        />
      )}
      <section hidden={editingScope} className="min-w-0 space-y-6" data-testid="codex-review">
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
        {version.workspace && !readOnly && (
          <Button size="sm" variant="ghost" disabled={locked} onClick={() => setEditingScope(true)}>
            {p.editScope}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Tabs value={tab} onValueChange={(value) => !locked && setTab(value)}>
          <TabsList variant="line" className="max-w-full overflow-x-auto">
            <TabsTrigger ref={walkthroughAnchors.overview} value="overview" disabled={locked}>
              {w.overview}
            </TabsTrigger>
            <TabsTrigger ref={walkthroughAnchors.issues} value="issues" disabled={locked}>
              {c.issues} ({review.issues.filter((issue) => issue.status === 'open').length})
            </TabsTrigger>
            <TabsTrigger ref={walkthroughAnchors.changes} value="changes" disabled={locked}>
              {c.changes}
            </TabsTrigger>
            <TabsTrigger ref={walkthroughAnchors.records} value="records" disabled={locked}>
              {c.records}
            </TabsTrigger>
            {window.api?.forflowJevAudit && (
              <TabsTrigger ref={walkthroughAnchors.jev} value="jev" disabled={locked}>
                Jev · Beta
              </TabsTrigger>
            )}
          </TabsList>
          {version.workspace && (
            <div hidden={tab === 'jev'}>
              <WorkspaceReviewWalkthrough
                active={active && !editingScope && tab !== 'jev'}
                tab={tab}
                anchors={walkthroughAnchors}
                disabled={locked}
                readOnly={readOnly}
                hasJev={Boolean(window.api?.forflowJevAudit)}
                singleRecord={jevEvidenceKey !== null}
                onTab={setTab}
              />
            </div>
          )}
          <TabsContent value="overview">
            <div className="space-y-6 pt-3">
              <section className="space-y-3 border-b border-border pb-5">
                <h4 className="text-base font-medium">{w.description}</h4>
                <p className="whitespace-pre-wrap break-words text-sm">{version.focus}</p>
                {!readOnly && (
                  <CodexReviewGoal
                    active={active && !editingScope && tab === 'overview'}
                    busy={locked}
                    focus={focus}
                    changed={focusChanged}
                    open={focusEditorOpen}
                    focusRequested={focusRequested}
                    onOpenChange={setFocusEditorOpen}
                    onChange={setFocus}
                    onSave={() => void reread()}
                  />
                )}
              </section>
              {version.workspace && <WorkspaceReviewSummary snapshot={version.workspace} />}
              <section
                className="space-y-3 border-b border-border pb-5"
                data-testid="review-check-summary"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-medium">{w.checks}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={locked}
                    onClick={() => setTab('jev')}
                  >
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
                <p className="text-xs text-muted-foreground">
                  {version.workspace ? p.jevScope : w.checkScope}
                </p>
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
            {version.workspace ? (
              <WorkspaceReviewChanges previous={previous} current={version} />
            ) : (
              <CodexReviewChanges previous={previous} current={version} />
            )}
          </TabsContent>
          <TabsContent value="jev" forceMount className="data-[state=inactive]:hidden">
            <JevAuditPanel
              key={`${version.id}:${jevEvidenceKey}`}
              active={active && !editingScope && tab === 'jev'}
              review={review}
              version={version}
              readOnly={readOnly || busy || focusChanged}
              initialEvidenceKey={jevEvidenceKey}
              receipts={receipts}
              onReceipt={record}
              onBusyChange={setChecking}
              onUpdated={setReview}
              onLocate={(key) => navigate(version.id, 'records', key)}
              onIssues={() => !locked && setTab('issues')}
              onEditGoal={editGoal}
              onEditSources={
                version.workspace && !readOnly ? () => !locked && setEditingScope(true) : undefined
              }
              onReread={!readOnly ? () => !locked && void reread() : undefined}
            />
          </TabsContent>
          <TabsContent value="records">
            {version.workspace && (
              <WorkspaceReviewEvidence
                key={`${version.id}:files:${locateKey}`}
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
            )}
            {(!version.workspace || version.audit.rows.length > 0) && (
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
            )}
          </TabsContent>
        </Tabs>
        {(!version.workspace || version.workspace.selection.sessionIds.length > 0) && (
          <CodexReviewCoverage version={version} />
        )}
        <p className="text-xs text-muted-foreground">{w.local}</p>
      </section>
    </>
  )
}
