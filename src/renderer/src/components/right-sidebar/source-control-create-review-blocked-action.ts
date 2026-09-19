import { translate } from '@/i18n/i18n'
import type {
  HostedReviewCreationBlockedReason,
  HostedReviewCreationEligibility,
  HostedReviewProvider
} from '../../../../shared/hosted-review'
import {
  localizedHostedReviewCopy,
  resolveSupportedHostedReviewCopyProvider
} from '@/i18n/hosted-review-localized-copy'

export function canClickBlockedCreateReviewReason(
  reason: HostedReviewCreationBlockedReason | undefined
): boolean {
  // Why: actionable blocked states stay clickable so the UI can explain the
  // next step inline instead of silently hard-disabling Create Review.
  return (
    reason === 'dirty' ||
    reason === 'default_branch' ||
    reason === 'no_upstream' ||
    reason === 'needs_push' ||
    reason === 'needs_sync' ||
    reason === 'auth_required'
  )
}

export function resolveHostedReviewAuthInstruction(provider: HostedReviewProvider): string {
  if (provider === 'gitlab') {
    return translate('forflow.desktopCopy.85f09431fb', 'Run glab auth login')
  }
  if (provider === 'azure-devops') {
    return translate('forflow.desktopCopy.cfce2dbcd5', 'Set ORCA_AZURE_DEVOPS_TOKEN')
  }
  if (provider === 'gitea') {
    return translate('forflow.desktopCopy.f8ef70334e', 'Set ORCA_GITEA_TOKEN')
  }
  if (provider === 'bitbucket') {
    return translate(
      'forflow.desktopCopy.6723642ac2',
      'Connect Bitbucket in Settings > Integrations'
    )
  }
  return translate('forflow.desktopCopy.ac3cb152d8', 'Run gh auth login')
}

export function resolveUnavailableCreateReviewLookupNoticeMessage(
  provider: HostedReviewProvider
): string {
  const copy = localizedHostedReviewCopy(resolveSupportedHostedReviewCopyProvider(provider))
  return translate(
    'forflow.dynamicCopy.7b9ef23cd5',
    'Create {{value0}} failed: Orca could not confirm whether this branch already has a {{value1}}. Retry once the {{value2}} lookup succeeds.',
    { value0: copy.shortLabel, value1: copy.reviewLabel, value2: copy.providerName }
  )
}

export function resolveBlockedCreateReviewNoticeMessage(
  eligibility: HostedReviewCreationEligibility | null | undefined
): string | null {
  if (!eligibility || eligibility.canCreate) {
    return null
  }
  const reason = eligibility.blockedReason
  if (eligibility.reviewLookupOutcome === 'unavailable' && reason === null) {
    return resolveUnavailableCreateReviewLookupNoticeMessage(eligibility.provider)
  }
  if (!canClickBlockedCreateReviewReason(reason)) {
    return null
  }
  const copy = localizedHostedReviewCopy(
    resolveSupportedHostedReviewCopyProvider(eligibility.provider)
  )
  switch (reason) {
    case 'dirty':
      return translate(
        'forflow.dynamicCopy.154152de76',
        'Create {{value0}} failed: commit or discard local changes before creating a {{value1}}.',
        { value0: copy.shortLabel, value1: copy.reviewLabel }
      )
    case 'default_branch':
      return translate(
        'forflow.dynamicCopy.9450369908',
        'Create {{value0}} failed: choose a feature branch before creating a {{value1}}.',
        { value0: copy.shortLabel, value1: copy.reviewLabel }
      )
    case 'no_upstream':
      return translate(
        'forflow.dynamicCopy.502642ae73',
        'Create {{value0}} failed: publish this branch before creating a {{value1}}.',
        { value0: copy.shortLabel, value1: copy.reviewLabel }
      )
    case 'needs_push':
      return translate(
        'forflow.dynamicCopy.2efc1117af',
        'Create {{value0}} failed: push this branch before creating a {{value1}}.',
        { value0: copy.shortLabel, value1: copy.reviewLabel }
      )
    case 'needs_sync':
      return translate(
        'forflow.dynamicCopy.b8544d21ca',
        'Create {{value0}} failed: sync this branch before creating a {{value1}}.',
        { value0: copy.shortLabel, value1: copy.reviewLabel }
      )
    case 'auth_required':
      return translate(
        'forflow.dynamicCopy.4d6829b46d',
        'Create {{value0}} failed: {{value1}} is not authenticated. Next step: {{value2}} in this environment.',
        {
          value0: copy.shortLabel,
          value1: copy.providerName,
          value2: resolveHostedReviewAuthInstruction(eligibility.provider)
        }
      )
    case 'detached_head':
    case 'existing_review':
    case 'fork_head_unsupported':
    case 'unsupported_provider':
    // Why: base_not_on_remote is a create-time hard failure surfaced as an error
    // result, not an inline-actionable eligibility state, so it is non-clickable.
    // falls through
    case 'base_not_on_remote':
    case null:
      return null
  }
}
