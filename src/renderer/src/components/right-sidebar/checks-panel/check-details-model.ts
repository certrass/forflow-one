import { translate } from '@/i18n/i18n'
import type { PRCheckDetail, PRCheckRunDetails } from '../../../../../shared/github/check-types'

export type CheckDetailsLoadState = {
  requestId?: number
  loading: boolean
  details: PRCheckRunDetails | null
  error: string | null
  /** Check state when the load failed or returned nothing, so a later state change can retry it. */
  errorAt?: { status: PRCheckDetail['status']; conclusion: PRCheckDetail['conclusion'] }
}

function getCheckIdentityKey(check: PRCheckDetail, index: number): string {
  if (check.checkRunId) {
    return `check-run:${check.checkRunId}`
  }
  if (check.workflowRunId) {
    return `workflow-run:${check.workflowRunId}`
  }
  // Why: manual/created GitLab jobs have no web_url, so they would otherwise key on
  // the list index and lose their cached log whenever the pipeline re-sorts.
  if (check.gitlabJobId) {
    return `gitlab-job:${check.gitlabJobId}`
  }
  if (check.url) {
    return `url:${check.url}`
  }
  return `fallback:${check.name}:${index}`
}

export function getCheckDetailsKey(
  contextKey: string,
  check: PRCheckDetail,
  index: number
): string {
  return `${contextKey}::${getCheckIdentityKey(check, index)}`
}

export function getCheckConclusion(check: PRCheckDetail): NonNullable<PRCheckDetail['conclusion']> {
  return check.conclusion ?? 'pending'
}

export function isFailedCheck(check: PRCheckDetail): boolean {
  // Why: action_required blocks merge just like a failure, so it must count as
  // not-passing — otherwise the summary reads "all checks passing" while
  // auto-merge stays blocked.
  return ['failure', 'cancelled', 'timed_out', 'action_required'].includes(
    getCheckConclusion(check)
  )
}

export function isFailureState(state: string | null | undefined): boolean {
  return state === 'failure' || state === 'failed' || state === 'cancelled' || state === 'timed_out'
}

export function getCheckStatusLabel(check: PRCheckDetail): string {
  const conclusion = getCheckConclusion(check)
  if (conclusion === 'success') {
    return translate('forflow.desktopCopy.f3686bb328', 'Successful')
  }
  if (conclusion === 'failure') {
    return translate('forflow.desktopCopy.031a8f0f65', 'Failed')
  }
  if (conclusion === 'cancelled') {
    return translate('forflow.desktopCopy.d353a99eb4', 'Cancelled')
  }
  if (conclusion === 'timed_out') {
    return translate('forflow.desktopCopy.9718cc761c', 'Timed out')
  }
  if (conclusion === 'action_required') {
    return translate('forflow.desktopCopy.adf69e75cc', 'Action required')
  }
  if (conclusion === 'neutral') {
    return translate('forflow.desktopCopy.1c6ac69f1e', 'Neutral')
  }
  if (conclusion === 'skipped') {
    return translate('forflow.desktopCopy.12698ce1ea', 'Skipped')
  }
  if (check.status === 'queued') {
    return translate('forflow.desktopCopy.661ff40a07', 'Queued')
  }
  if (check.status === 'in_progress') {
    return translate('forflow.desktopCopy.c1f88e9d6c', 'In progress')
  }
  return translate('forflow.desktopCopy.331551b0de', 'Pending')
}

export function formatCheckTimestamp(input: string | null | undefined): string | null {
  if (!input) {
    return null
  }
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function getFailedChecksForDetails(checks: PRCheckDetail[]): PRCheckDetail[] {
  return checks.filter(isFailedCheck)
}

export type CheckDetailsStickySurface = 'sidebar' | 'card'

export function getCheckDetailsStickySurfaceClass(surface: CheckDetailsStickySurface): string {
  return surface === 'card' ? 'bg-card/95' : 'bg-sidebar/95'
}
