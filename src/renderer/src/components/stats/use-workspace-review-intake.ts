import { useEffect, useRef, useState } from 'react'
import type { CodexReview } from '../../../../shared/codex-review-types'
import {
  workspaceReviewQuerySchema,
  type WorkspaceReviewQuery,
  type WorkspaceReviewTarget
} from '../../../../shared/workspace-review-types'
import { workspaceReviewCopy } from './workspace-review-copy'
import { reviewCopy } from './review-copy'

function selectionIdentity(target: WorkspaceReviewTarget | undefined): string {
  return (
    JSON.stringify(
      target && [
        target.id,
        target.rootPath,
        target.hostId,
        target.selector,
        target.kind,
        target.projectId,
        target.available
      ]
    ) ?? ''
  )
}

export function useWorkspaceReviewIntake(
  active: boolean,
  initial: CodexReview | undefined,
  onOpenReview: (review: CodexReview) => void
) {
  const c = workspaceReviewCopy()
  const r = reviewCopy()
  const snapshot = initial?.versions.at(-1)?.workspace
  const selectedTarget = useRef(snapshot?.target)
  const [targets, setTargets] = useState<WorkspaceReviewTarget[]>([])
  const [saved, setSaved] = useState<CodexReview[]>([])
  const [workspaceId, setWorkspaceId] = useState(snapshot?.target.id ?? '')
  const [focus, setFocus] = useState(initial?.versions.at(-1)?.focus ?? '')
  const [selection, setSelection] = useState<WorkspaceReviewQuery['selection']>(
    snapshot?.selection ?? {
      files: [],
      sessionIds: [],
      policyReference: '',
      applicability: 'unconfirmed',
      applicabilityReason: ''
    }
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const pending = useRef(false)
  const visibility = useRef(0)
  useEffect(() => {
    visibility.current += 1
    return () => {
      visibility.current += 1
    }
  }, [active])
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
          const previous = selectedTarget.current
          const current = available.find((entry) => entry.id === previous?.id)
          if (previous && selectionIdentity(previous) !== selectionIdentity(current)) {
            setFocus('')
            setSelection({
              files: [],
              sessionIds: [],
              policyReference: '',
              applicability: 'unconfirmed',
              applicabilityReason: ''
            })
            selectedTarget.current = current
            setError(c.targetChanged)
          } else {
            setError(null)
          }
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
  }, [active, revision, c.unavailable, c.targetChanged, r.error])
  const target = targets.find((value) => value.id === workspaceId)
  const chooseTarget = (id: string): void => {
    if (id === workspaceId) {
      return
    }
    setWorkspaceId(id)
    selectedTarget.current = targets.find((value) => value.id === id)
    setFocus('')
    setSelection({
      files: [],
      sessionIds: [],
      policyReference: '',
      applicability: 'unconfirmed',
      applicabilityReason: ''
    })
    setError(null)
  }
  const submit = async (): Promise<void> => {
    if (pending.current || !active) {
      return
    }
    if (!target?.available || !focus.trim()) {
      setError(c.required)
      return
    }
    if (selection.files.length < 1 || selection.files.length > 40) {
      setError(c.fileLimit)
      return
    }
    if (selection.applicability === 'not_applicable' && !selection.applicabilityReason.trim()) {
      setError(c.reasonRequired)
      return
    }
    const parsed = workspaceReviewQuerySchema.safeParse({
      workspaceId,
      focus,
      selection,
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
    const startedVisible = visibility.current
    try {
      const value = await open(parsed.data)
      if (visibility.current === startedVisible) {
        onOpenReview(value)
      }
    } catch (reason) {
      if (visibility.current === startedVisible) {
        setError(reason instanceof Error ? reason.message : r.error)
      }
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return {
    targets,
    saved,
    target,
    workspaceId,
    focus,
    setFocus,
    selection,
    setSelection,
    error,
    loading,
    busy,
    chooseTarget,
    submit,
    refresh: () => setRevision((value) => value + 1)
  }
}
