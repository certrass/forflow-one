import { useEffect, useRef, useState } from 'react'
import type { CodexReview } from '../../../../shared/codex-review-types'
import {
  workspaceReviewQuerySchema,
  type WorkspaceReviewQuery,
  type WorkspaceReviewTarget
} from '../../../../shared/workspace-review-types'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { WorkspaceReviewTargetPicker } from './WorkspaceReviewTargetPicker'
import { WorkspaceReviewSessions } from './WorkspaceReviewSessions'
import { workspaceReviewCopy } from './workspace-review-copy'
import { reviewCopy } from './review-copy'

type FileKind = WorkspaceReviewQuery['selection']['files'][number]['kind']
const FILE_KINDS: FileKind[] = ['code', 'document', 'verification']

export function WorkspaceReviewIntake({
  active,
  initial,
  onOpenReview,
  onCancel
}: {
  active: boolean
  initial?: CodexReview
  onOpenReview: (review: CodexReview) => void
  onCancel?: () => void
}): React.JSX.Element {
  const c = workspaceReviewCopy()
  const r = reviewCopy()
  const snapshot = initial?.versions.at(-1)?.workspace
  const [targets, setTargets] = useState<WorkspaceReviewTarget[]>([])
  const [saved, setSaved] = useState<CodexReview[]>([])
  const [workspaceId, setWorkspaceId] = useState(snapshot?.target.id ?? '')
  const [fileText, setFileText] = useState(() => ({
    code:
      snapshot?.selection.files
        .filter((file) => file.kind === 'code')
        .map((file) => file.path)
        .join('\n') ?? '',
    document:
      snapshot?.selection.files
        .filter((file) => file.kind === 'document')
        .map((file) => file.path)
        .join('\n') ?? '',
    verification:
      snapshot?.selection.files
        .filter((file) => file.kind === 'verification')
        .map((file) => file.path)
        .join('\n') ?? ''
  }))
  const [focus, setFocus] = useState(initial?.versions.at(-1)?.focus ?? '')
  const [sessionIds, setSessionIds] = useState<string[]>(snapshot?.selection.sessionIds ?? [])
  const [policyReference, setPolicyReference] = useState(snapshot?.selection.policyReference ?? '')
  const [applicability, setApplicability] = useState<
    WorkspaceReviewQuery['selection']['applicability']
  >(snapshot?.selection.applicability ?? 'unconfirmed')
  const [applicabilityReason, setApplicabilityReason] = useState(
    snapshot?.selection.applicabilityReason ?? ''
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const pending = useRef(false)
  const visible = useRef(active)
  useEffect(() => {
    visible.current = active
    return () => {
      visible.current = false
    }
  }, [active])
  const target = targets.find((value) => value.id === workspaceId)
  useEffect(() => {
    if (!active) {
      return
    }
    let cancelled = false
    const api = window.api?.codexUsage
    if (!api?.listWorkspaceReviewTargets || !api.listWorkspaceReviews) {
      setError(c.unavailable)
      return
    }
    setLoading(true)
    void Promise.all([api.listWorkspaceReviewTargets(), api.listWorkspaceReviews()])
      .then(([available, reviews]) => {
        if (!cancelled) {
          setTargets(available)
          setSaved(reviews)
          setError(null)
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : r.error)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [active, revision, c.unavailable, r.error])
  const submit = async (): Promise<void> => {
    if (pending.current) {
      return
    }
    const files = FILE_KINDS.flatMap((kind) =>
      fileText[kind]
        .split(/\r?\n/)
        .map((path) => path.trim())
        .filter(Boolean)
        .map((path) => ({ path, kind }))
    )
    if (!target?.available || !focus.trim()) {
      setError(c.required)
      return
    }
    if (files.length < 1 || files.length > 40) {
      setError(c.fileLimit)
      return
    }
    if (new Set(files.map((file) => file.path)).size !== files.length) {
      setError(c.duplicate)
      return
    }
    if (applicability === 'not_applicable' && !applicabilityReason.trim()) {
      setError(c.reasonRequired)
      return
    }
    const parsed = workspaceReviewQuerySchema.safeParse({
      workspaceId,
      focus,
      selection: { files, sessionIds, policyReference, applicability, applicabilityReason },
      ...(initial ? { expectedRevision: initial.revision } : {})
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? r.error)
      return
    }
    const open = window.api?.codexUsage?.openWorkspaceReview
    if (!open) {
      setError(c.unavailable)
      return
    }
    pending.current = true
    setBusy(true)
    setError(null)
    try {
      const value = await open(parsed.data)
      if (visible.current) {
        onOpenReview(value)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : r.error)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <section className="space-y-6" data-testid="workspace-review-intake">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-medium">{c.title}</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">{c.description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading || busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          {r.refresh}
        </Button>
      </div>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="space-y-2">
          <Label>{c.target}</Label>
          <div>
            <WorkspaceReviewTargetPicker
              targets={targets}
              value={workspaceId}
              disabled={loading || busy || Boolean(initial)}
              onChange={setWorkspaceId}
            />
          </div>
          {target && (
            <p className="break-all text-xs text-muted-foreground">
              {target.kind === 'worktree' ? c.git : c.folder} · {target.rootPath}
            </p>
          )}
          {target && !target.available && (
            <p role="status" className="text-sm text-muted-foreground">
              {target.unavailableReason ?? c.unsupported}
            </p>
          )}
          {!loading && targets.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">{c.noTargets}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="workspace-review-focus">{c.focus}</Label>
          <p className="text-xs text-muted-foreground">{c.focusHint}</p>
          <Textarea
            id="workspace-review-focus"
            value={focus}
            maxLength={2000}
            disabled={busy}
            onChange={(event) => setFocus(event.target.value)}
          />
        </div>
        <section className="space-y-3">
          <h4 className="text-sm font-medium">{c.files}</h4>
          <p className="text-xs text-muted-foreground">{c.fileNote}</p>
          {FILE_KINDS.map((kind) => (
            <div className="space-y-2" key={kind}>
              <Label htmlFor={`workspace-review-${kind}`}>{c[kind]}</Label>
              <Textarea
                id={`workspace-review-${kind}`}
                value={fileText[kind]}
                maxLength={80000}
                disabled={busy}
                onChange={(event) =>
                  setFileText((current) => ({ ...current, [kind]: event.target.value }))
                }
              />
            </div>
          ))}
        </section>
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium">
            {c.sessions} · {sessionIds.length}
          </summary>
          <WorkspaceReviewSessions selected={sessionIds} disabled={busy} onChange={setSessionIds} />
        </details>
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium">{c.policy}</summary>
          <p className="text-xs text-muted-foreground">{c.policyHint}</p>
          <Textarea
            aria-label={c.policy}
            value={policyReference}
            maxLength={4000}
            disabled={busy}
            onChange={(event) => setPolicyReference(event.target.value)}
          />
          <Label>{c.applicability}</Label>
          <Select
            value={applicability}
            disabled={busy}
            onValueChange={(value) => {
              if (value === 'unconfirmed' || value === 'applies' || value === 'not_applicable') {
                setApplicability(value)
              }
            }}
          >
            <SelectTrigger aria-label={c.applicability}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unconfirmed">{c.unconfirmed}</SelectItem>
              <SelectItem value="applies">{c.applies}</SelectItem>
              <SelectItem value="not_applicable">{c.notApplicable}</SelectItem>
            </SelectContent>
          </Select>
          <Label htmlFor="workspace-review-applicability">{c.applicabilityReason}</Label>
          <Textarea
            id="workspace-review-applicability"
            value={applicabilityReason}
            maxLength={2000}
            disabled={busy}
            onChange={(event) => setApplicabilityReason(event.target.value)}
          />
        </details>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{c.prepareNote}</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || loading || !target?.available}>
            {busy ? c.preparing : c.prepare}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
              {r.close}
            </Button>
          )}
        </div>
      </form>
      {!initial && (
        <section className="space-y-3 border-t border-border pt-5">
          <h4 className="text-sm font-medium">{c.saved}</h4>
          {saved.map((review) => (
            <div
              key={review.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="break-words text-sm">
                  {review.versions.at(-1)?.workspace?.target.name ?? review.id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {review.versions.length} {r.version} ·{' '}
                  {review.issues.filter((issue) => issue.status === 'open').length} {r.hasIssues}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => onOpenReview(review)}
              >
                {r.open}
              </Button>
            </div>
          ))}
          {!loading && !saved.length && (
            <p className="text-sm text-muted-foreground">{c.noSaved}</p>
          )}
        </section>
      )}
    </section>
  )
}
