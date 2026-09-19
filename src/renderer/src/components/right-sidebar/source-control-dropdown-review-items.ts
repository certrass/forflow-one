// Why: the two review-creation rows share one blocked-reason string, so the "Push first" hint on
// Create PR and the tooltip on Push-before-PR can never disagree.

import { translate } from '@/i18n/i18n'
import { supportsHostedReviewCreation } from '../../../../shared/hosted-review-creation-providers'
import {
  localizedHostedReviewCopy,
  resolveSupportedHostedReviewCopyProvider
} from '@/i18n/hosted-review-localized-copy'
import {
  canClickBlockedCreateReviewReason,
  resolveHostedReviewAuthInstruction
} from './source-control-create-review-blocked-action'
import type { PrimaryActionInputs } from './source-control-primary-action'
import type { DropdownItem } from './source-control-dropdown-item-types'
import type { DropdownActionContext } from './source-control-dropdown-action-context'

export type HostedReviewDropdownItems = {
  createPR: DropdownItem
  pushCreatePR: DropdownItem
}

function reviewCopy(
  provider: NonNullable<PrimaryActionInputs['hostedReviewCreation']>['provider'] | undefined
): ReturnType<typeof localizedHostedReviewCopy> & {
  authInstruction: string
} {
  return {
    ...localizedHostedReviewCopy(resolveSupportedHostedReviewCopyProvider(provider)),
    authInstruction: resolveHostedReviewAuthInstruction(provider ?? 'github')
  }
}

export function buildHostedReviewDropdownItems(
  ctx: DropdownActionContext
): HostedReviewDropdownItems {
  const { hostedReviewCreation, globalBusy, upstreamLoading, shouldForcePushWithLease } = ctx
  const createReviewCopy = reviewCopy(hostedReviewCreation?.provider)

  const createBlockedHint = ((): string => {
    switch (hostedReviewCreation?.blockedReason) {
      case 'dirty':
        return translate('forflow.desktopCopy.1951a2eb97', 'Commit changes first')
      case 'detached_head':
        return translate('forflow.desktopCopy.76a2896df9', 'Check out a branch first')
      case 'default_branch':
        return translate('forflow.desktopCopy.5fc9297158', 'Switch to a feature branch')
      case 'no_upstream':
        return translate('forflow.desktopCopy.fe4e7d8ab1', 'Publish Branch')
      case 'needs_push':
        return translate('forflow.desktopCopy.5a632dc6db', 'Push first')
      case 'needs_sync':
        return shouldForcePushWithLease ? 'Force Push first' : 'Sync first'
      case 'auth_required':
        return translate('forflow.dynamicCopy.cbaa0b8a6f', '{{value0}} in this environment', {
          value0: createReviewCopy.authInstruction
        })
      case 'unsupported_provider':
        return translate('forflow.desktopCopy.1609d5fba4', 'Unsupported provider')
      case 'existing_review':
        return translate('forflow.dynamicCopy.fd9f0aa0cd', 'A {{value0}} already exists', {
          value0: createReviewCopy.reviewLabel
        })
      case 'fork_head_unsupported':
        return translate('forflow.desktopCopy.8a620d5d99', 'Fork head unsupported')
      case 'base_not_on_remote':
        return translate('forflow.desktopCopy.769d9432b5', 'Base branch is not on the remote')
      case null:
      case undefined:
        return upstreamLoading
          ? translate('forflow.desktopCopy.1358e0f32b', 'Checking branch status…')
          : 'Branch is not ready'
    }
  })()

  const createPR: DropdownItem = {
    kind: 'create_pr',
    label: translate(
      'auto.components.right.sidebar.source.control.dropdown.items.9e779995dd',
      'Create {{value0}}',
      { value0: createReviewCopy.shortLabel }
    ),
    title: hostedReviewCreation?.canCreate
      ? `Create a ${createReviewCopy.reviewLabel} for this branch`
      : createBlockedHint,
    hint: hostedReviewCreation?.canCreate ? undefined : createBlockedHint,
    disabled:
      globalBusy ||
      !supportsHostedReviewCreation(hostedReviewCreation?.provider) ||
      (!hostedReviewCreation?.canCreate &&
        !canClickBlockedCreateReviewReason(hostedReviewCreation?.blockedReason))
  }

  const canPushAndCreate =
    !globalBusy &&
    !upstreamLoading &&
    supportsHostedReviewCreation(hostedReviewCreation?.provider) &&
    (hostedReviewCreation.blockedReason === 'needs_push' ||
      (hostedReviewCreation.blockedReason === 'needs_sync' && shouldForcePushWithLease))
  const pushCreatePR: DropdownItem = {
    kind: 'push_create_pr',
    label: shouldForcePushWithLease
      ? `Force Push before ${createReviewCopy.shortLabel}`
      : `Push before ${createReviewCopy.shortLabel}`,
    title: canPushAndCreate
      ? shouldForcePushWithLease
        ? `Force push with lease before creating a ${createReviewCopy.reviewLabel}`
        : `Push local commits before creating a ${createReviewCopy.reviewLabel}`
      : createBlockedHint,
    hint: canPushAndCreate ? undefined : createBlockedHint,
    disabled: !canPushAndCreate
  }

  return { createPR, pushCreatePR }
}
