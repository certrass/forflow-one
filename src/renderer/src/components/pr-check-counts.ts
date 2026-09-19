import { translate } from '../i18n/i18n'
import { summarizeProviderChecks } from '../../../shared/provider-check-summary'
import type { PRCheckDetail } from '../../../shared/github/check-types'

export type PRCheckCounts = {
  passing: number
  failing: number
  needsAction: number
  pending: number
  neutral: number
}

export function getCheckConclusion(check: PRCheckDetail): NonNullable<PRCheckDetail['conclusion']> {
  if (check.conclusion) {
    return check.conclusion
  }
  return check.status === 'completed' ? 'neutral' : 'pending'
}

/**
 * The check-tab breakdown shared by the PR page and the work-item dialog. Both panes used to keep
 * private copies, which is how one drifted from the Checks panel's own header.
 */
export function getCheckCounts(checks: readonly PRCheckDetail[]): PRCheckCounts {
  // Why: every bucket is read off the shared rollup rather than re-derived, so these panes cannot
  // disagree with the checks pill. action_required is the one split back out: it blocks merge like
  // a failure but reads amber, not red.
  const summary = summarizeProviderChecks(checks)
  const needsAction = checks.filter(
    (check) => getCheckConclusion(check) === 'action_required'
  ).length
  return {
    passing: summary.passed,
    failing: summary.failed - needsAction,
    needsAction,
    pending: summary.pending,
    neutral: summary.neutral
  }
}

/** `tone` keys the caller's `CHECK_COLOR`/`CHECK_ICON` maps so styling stays with the surface. */
export type PRCheckCountChip = {
  tone: 'success' | 'failure' | 'action_required' | 'pending' | 'neutral'
  label: string
}

/**
 * The count chips above the check list on the PR page and the work-item dialog. One builder so the
 * two panes cannot word the same bucket differently — the neutral bucket read "skipped" here while
 * the sidebar Checks panel called the identical checks "unresolved".
 */
export function getCheckCountChips(counts: PRCheckCounts): PRCheckCountChip[] {
  const chips: PRCheckCountChip[] = []
  if (counts.passing > 0) {
    chips.push({
      tone: 'success',
      label: translate('auto.components.pr-check-counts.passingChip', '{{value0}} passing', {
        value0: counts.passing
      })
    })
  }
  if (counts.failing > 0) {
    chips.push({
      tone: 'failure',
      label: translate('auto.components.pr-check-counts.failingChip', '{{value0}} failing', {
        value0: counts.failing
      })
    })
  }
  if (counts.needsAction > 0) {
    chips.push({
      tone: 'action_required',
      label: translate(
        'auto.components.pr-check-counts.needsActionChip',
        '{{value0}} action required',
        { value0: counts.needsAction }
      )
    })
  }
  if (counts.pending > 0) {
    chips.push({
      tone: 'pending',
      label: translate('auto.components.pr-check-counts.pendingChip', '{{value0}} pending', {
        value0: counts.pending
      })
    })
  }
  if (counts.neutral > 0) {
    chips.push({
      tone: 'neutral',
      label: translate('auto.components.pr-check-counts.unresolvedChip', '{{value0}} unresolved', {
        value0: counts.neutral
      })
    })
  }
  return chips
}

export function getChecksSummaryLabel(checks: readonly PRCheckDetail[]): string {
  const counts = getCheckCounts(checks)
  if (checks.length === 0) {
    return translate('forflow.desktopCopy.e7c36cafa7', 'No checks found')
  }
  if (counts.failing > 0) {
    return counts.failing === 1
      ? translate('forflow.finalCopy.b175ea4906', '{{count}} check failing', {
          count: counts.failing
        })
      : translate('forflow.finalCopy.715178c003', '{{count}} checks failing', {
          count: counts.failing
        })
  }
  // Why: action_required (e.g. workflow awaiting approval) blocks merge but isn't a failure, so surface it distinctly.
  if (counts.needsAction > 0) {
    return counts.needsAction === 1
      ? translate('forflow.finalCopy.bf14e0ce17', '{{count}} check needs action', {
          count: counts.needsAction
        })
      : translate('forflow.finalCopy.e50a6acd39', '{{count}} checks need action', {
          count: counts.needsAction
        })
  }
  if (counts.pending > 0) {
    return counts.pending === 1
      ? translate('forflow.finalCopy.460a094a05', '{{count}} check pending', {
          count: counts.pending
        })
      : translate('forflow.finalCopy.0390d67128', '{{count}} checks pending', {
          count: counts.pending
        })
  }
  if (counts.passing === checks.length) {
    return translate('forflow.desktopCopy.bcb57271d6', 'All checks passing')
  }
  return translate('forflow.dynamicCopy.3aaf2d56ac', '{{value0}} of {{value1}} checks passing', {
    value0: counts.passing,
    value1: checks.length
  })
}
