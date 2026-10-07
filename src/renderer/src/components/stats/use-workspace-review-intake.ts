import { useEffect, useRef, useState } from 'react'
import type { CodexReview } from '../../../../shared/codex-review-types'
import {
  workspaceReviewQuerySchema,
  type WorkspaceReviewQuery,
  type WorkspaceReviewTarget
} from '../../../../shared/workspace-review-types'
import { workspaceReviewCopy } from './workspace-review-copy'
import { reviewCopy } from './review-copy'
import { clarifiedReviewFocus, reviewIntakeCopy } from './review-intake-copy'

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
  onOpenReview: (review: CodexReview) => void,
  initialTarget?: Pick<WorkspaceReviewTarget, 'hostId' | 'selector'>
) {
  const c = workspaceReviewCopy()
  const r = reviewCopy()
  const snapshot = initial?.versions.at(-1)?.workspace
  const [step, setStep] = useState<1 | 2 | 3>(initial ? 3 : 1)
  const selectedTarget = useRef(snapshot?.target)
  const pendingInitialTarget = useRef(initial ? undefined : initialTarget)
  const [targets, setTargets] = useState<WorkspaceReviewTarget[]>([])
  const [saved, setSaved] = useState<CodexReview[]>([])
  const [workspaceId, setWorkspaceId] = useState(snapshot?.target.id ?? '')
  const [focus, setFocusValue] = useState(initial?.versions.at(-1)?.focus ?? '')
  const [acceptance, setAcceptance] = useState('')
  const [clarifyingGoal, setClarifyingGoal] = useState(false)
  const [goalPrepared, setGoalPrepared] = useState(Boolean(initial))
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
          const preferred = pendingInitialTarget.current
          pendingInitialTarget.current = undefined
          if (preferred && !selectedTarget.current) {
            const matches = available.filter(
              (entry) => entry.hostId === preferred.hostId && entry.selector === preferred.selector
            )
            if (matches.length === 1) {
              selectedTarget.current = matches[0]
              setWorkspaceId(matches[0].id)
            }
          }
          const previous = selectedTarget.current
          const current = available.find((entry) => entry.id === previous?.id)
          if (previous && selectionIdentity(previous) !== selectionIdentity(current)) {
            setStep(1)
            setFocusValue('')
            setAcceptance('')
            setClarifyingGoal(false)
            setGoalPrepared(false)
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
  const setFocus = (value: string): void => {
    setFocusValue(value)
    setAcceptance('')
    setClarifyingGoal(false)
    setGoalPrepared(false)
  }
  const preparedFocus = clarifiedReviewFocus(focus, acceptance)
  const useGoal = (answer?: string): void => {
    if (busy || loading || !focus.trim() || !target?.available) {
      return
    }
    const next = answer === undefined ? focus : clarifiedReviewFocus(focus, answer)
    if (next.length > 2000) {
      setError(reviewIntakeCopy().tooLong)
      return
    }
    setFocusValue(next)
    setGoalPrepared(true)
    setClarifyingGoal(false)
    setStep(3)
    setError(null)
  }
  const chooseTarget = (id: string): void => {
    if (id === workspaceId) {
      return
    }
    setWorkspaceId(id)
    setStep(1)
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
    step,
    setStep,
    targets,
    saved,
    target,
    workspaceId,
    focus,
    setFocus,
    acceptance,
    setAcceptance,
    clarifyingGoal,
    setClarifyingGoal,
    goalPrepared,
    preparedFocus,
    useGoal,
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
