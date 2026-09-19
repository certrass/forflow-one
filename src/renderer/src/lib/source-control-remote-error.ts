import {
  truncateDetail,
  extractPublishFailureDetail,
  resolveSubmodulePushFailureMessage
} from './source-control-remote-error-detail'
import { translate } from '@/i18n/i18n'
import { stripCredentialsFromMessage } from '../../../shared/git-remote-error'
import {
  isPushHookFailure,
  summarizePushFailure
} from '../../../shared/source-control-push-failure'

const SYNC_PUSH_STAGE_ERROR = Symbol('source-control-sync-push-stage-error')
type SyncPushStageMarkedError = Error & { [SYNC_PUSH_STAGE_ERROR]?: true }

export type RemoteOperationErrorOptions = {
  publish?: boolean
  isPush?: boolean
  isForcePush?: boolean
  isSync?: boolean
  isSyncPushStage?: boolean
  isFetch?: boolean
  isFastForward?: boolean
  isRebase?: boolean
}

export function markSyncPushStageError<T>(error: T): T {
  if (error instanceof Error) {
    Object.defineProperty(error, SYNC_PUSH_STAGE_ERROR, {
      configurable: true,
      value: true
    })
  }
  return error
}

export function isSyncPushStageError(error: unknown): boolean {
  return (
    error instanceof Error && (error as SyncPushStageMarkedError)[SYNC_PUSH_STAGE_ERROR] === true
  )
}

// Why: shared patterns so unconcluded-merge vs fresh-conflict toast copy cannot
// drift between the two branches below.
const UNCONCLUDED_MERGE_ERROR_PATTERN =
  /unmerged files|needs merge|you have not concluded your merge/i
const FRESH_MERGE_CONFLICT_ERROR_PATTERN = /automatic merge failed|CONFLICT \(|fix conflicts/i

export function resolveRemoteOperationErrorMessage(
  error: unknown,
  options?: RemoteOperationErrorOptions
): string {
  if (!(error instanceof Error)) {
    return translate('forflow.finalCopy.0d35514cc1', 'Remote operation failed')
  }

  if (UNCONCLUDED_MERGE_ERROR_PATTERN.test(error.message)) {
    if (options?.isRebase) {
      return translate(
        'forflow.desktopCopy.8f239805b1',
        'Rebase blocked — resolve existing conflicts first.'
      )
    }
    return options?.isSync
      ? translate(
          'forflow.finalCopy.f7dbbf0efd',
          'Sync blocked — resolve existing merge conflicts first.'
        )
      : translate(
          'forflow.finalCopy.8babebf1ec',
          'Pull blocked — resolve existing merge conflicts first.'
        )
  }

  if (FRESH_MERGE_CONFLICT_ERROR_PATTERN.test(error.message)) {
    if (options?.isRebase) {
      return translate(
        'forflow.desktopCopy.ebae7922a4',
        'Rebase stopped with conflicts. Resolve them in Source Control, then continue the rebase.'
      )
    }
    return options?.isSync
      ? translate(
          'forflow.finalCopy.4348e0fd51',
          'Sync stopped with merge conflicts. Resolve them in Source Control, then commit the merge.'
        )
      : translate(
          'forflow.finalCopy.2f913cb2e9',
          'Pull stopped with merge conflicts. Resolve them in Source Control, then commit the merge.'
        )
  }

  if (options?.publish) {
    const submoduleMessage = resolveSubmodulePushFailureMessage(
      error.message,
      translate('forflow.desktopCopy.fe4e7d8ab1', 'Publish Branch')
    )
    if (submoduleMessage) {
      return submoduleMessage
    }
  }

  if (options?.isSync) {
    const submoduleMessage = resolveSubmodulePushFailureMessage(
      error.message,
      translate('forflow.finalCopy.8d261a372f', 'Sync')
    )
    if (submoduleMessage) {
      return submoduleMessage
    }
  }

  if (options?.isForcePush) {
    const submoduleMessage = resolveSubmodulePushFailureMessage(
      error.message,
      translate('forflow.finalCopy.163f86dca7', 'Force Push')
    )
    if (submoduleMessage) {
      return submoduleMessage
    }
  }

  if (options?.isPush) {
    const submoduleMessage = resolveSubmodulePushFailureMessage(
      error.message,
      translate('forflow.finalCopy.731ce7ed80', 'Push')
    )
    if (submoduleMessage) {
      return submoduleMessage
    }
  }

  const isPushLikeOperation =
    options?.isPush || options?.isForcePush || options?.publish || options?.isSyncPushStage
  if (isPushLikeOperation && isPushHookFailure(error.message)) {
    const summary = summarizePushFailure(error.message)
    const operationLabel = options?.publish
      ? translate('forflow.desktopCopy.fe4e7d8ab1', 'Publish Branch')
      : options?.isSyncPushStage
        ? translate('forflow.finalCopy.8d261a372f', 'Sync')
        : options?.isForcePush
          ? translate('forflow.finalCopy.163f86dca7', 'Force Push')
          : translate('forflow.finalCopy.731ce7ed80', 'Push')
    return translate('forflow.finalCopy.f6c5847ffe', '{{operation}} blocked — {{detail}}', {
      operation: operationLabel,
      detail: summary.charAt(0).toLowerCase() + summary.slice(1)
    })
  }

  // Why: under sync, the inner push runs *after* a successful pull, so a
  // non-fast-forward at that point means the remote raced ahead between
  // fetch and push — not "user forgot to pull". Saying "Pull first" would
  // be wrong (sync just did). Branch isSync above the shared NFF path so
  // sync gets a sync-shaped message instead of inheriting the push wording.
  if (
    options?.isSync &&
    /non-fast-forward|fetch first|updates were rejected/i.test(error.message)
  ) {
    return translate(
      'forflow.desktopCopy.6eb566e6b4',
      'Sync failed — remote moved while syncing. Try again.'
    )
  }

  // Why: force-with-lease rejection means the remote moved since our last
  // snapshot; telling the user to pull would defeat the explicit force-push
  // path and can reintroduce commits they meant to replace.
  if (
    options?.isForcePush &&
    /non-fast-forward|fetch first|updates were rejected|stale info/i.test(error.message)
  ) {
    return translate(
      'forflow.desktopCopy.663b6106ed',
      'Force push rejected — remote changed since last fetch. Fetch first, then try again.'
    )
  }

  // Why: non-fast-forward/rejected detection is shared across publish and push so
  // both paths surface the same actionable toast regardless of operation type.
  if (/non-fast-forward|fetch first|updates were rejected/i.test(error.message)) {
    return translate(
      'forflow.desktopCopy.d4b7eed02a',
      'Push rejected — remote has changes. Pull first, then try again.'
    )
  }

  // Why: `git pull` / merge refuses to run when the working tree has changes
  // that would be overwritten; surface a single readable line instead of the
  // multi-line git stderr (which lists every affected path).
  if (
    /local changes.*would be overwritten|Please commit your changes or stash them/i.test(
      error.message
    )
  ) {
    if (options?.isRebase) {
      return translate(
        'forflow.desktopCopy.3ef10426d5',
        'Rebase blocked — commit or stash your local changes first.'
      )
    }
    if (options?.isFastForward) {
      return translate(
        'forflow.desktopCopy.bb25e7fb10',
        'Fast-forward blocked — commit or stash your local changes first.'
      )
    }
    return translate(
      'forflow.desktopCopy.f1edcd3dee',
      'Pull blocked — commit or stash your local changes first.'
    )
  }

  if (/Pull would overwrite local changes/i.test(error.message)) {
    if (options?.isRebase) {
      return translate(
        'forflow.desktopCopy.3ef10426d5',
        'Rebase blocked — commit or stash your local changes first.'
      )
    }
    if (options?.isFastForward) {
      return translate(
        'forflow.desktopCopy.bb25e7fb10',
        'Fast-forward blocked — commit or stash your local changes first.'
      )
    }
    return translate(
      'forflow.desktopCopy.f1edcd3dee',
      'Pull blocked — commit or stash your local changes first.'
    )
  }

  if (/Pull would overwrite untracked files/i.test(error.message)) {
    if (options?.isRebase) {
      return translate(
        'forflow.desktopCopy.21eb744112',
        'Rebase blocked — move, remove, or add untracked files first.'
      )
    }
    if (options?.isFastForward) {
      return translate(
        'forflow.desktopCopy.29e110795c',
        'Fast-forward blocked — move, remove, or add untracked files first.'
      )
    }
    return translate(
      'forflow.desktopCopy.2c8c58e957',
      'Pull blocked — move, remove, or add untracked files first.'
    )
  }

  if (options?.publish) {
    // Why: publish failures often bubble up as raw wrapped git/IPC payloads; this
    // keeps the toast human-readable while preserving the actionable fatal reason.
    const detail = extractPublishFailureDetail(error.message)
    if (detail) {
      return translate(
        'forflow.dynamicCopy.1037e0b6ba',
        'Publish Branch failed. {{value0}}. Check your remote access and try again.',
        { value0: detail }
      )
    }

    return translate(
      'forflow.desktopCopy.8b4fdcfb8b',
      'Publish Branch failed. Check your remote access and try again.'
    )
  }

  if (options?.isSync) {
    // Why: the user invoked Sync — surface "Sync failed" rather than leaking
    // the inner-step name ("Push failed"). Detail extraction matches push so
    // auth / protected-branch reasons stay actionable.
    const detail = extractPublishFailureDetail(error.message)
    if (detail) {
      return translate(
        'forflow.dynamicCopy.3d9067665e',
        'Sync failed. {{value0}}. Check your remote access and try again.',
        { value0: detail }
      )
    }
    return translate(
      'forflow.desktopCopy.a3c9c7f99a',
      'Sync failed. Check your connection and try again.'
    )
  }

  if (options?.isForcePush) {
    const detail = extractPublishFailureDetail(error.message)
    if (detail) {
      return translate(
        'forflow.dynamicCopy.1838185fdc',
        'Force Push failed. {{value0}}. Check your remote access and try again.',
        { value0: detail }
      )
    }
    return translate(
      'forflow.desktopCopy.20d774c610',
      'Force Push failed. Check your connection and try again.'
    )
  }

  if (options?.isPush) {
    // Why: surfacing fatal/remote lines from git is more actionable than a generic
    // connection message for auth errors, protected branches, etc.
    const detail = extractPublishFailureDetail(error.message)
    if (detail) {
      return translate(
        'forflow.dynamicCopy.39c3107511',
        'Push failed. {{value0}}. Check your remote access and try again.',
        { value0: detail }
      )
    }
    return translate(
      'forflow.desktopCopy.b6d05529c1',
      'Push failed. Check your connection and try again.'
    )
  }

  if (options?.isFetch) {
    const detail =
      extractPublishFailureDetail(error.message) ??
      truncateDetail(stripCredentialsFromMessage(error.message))
    return translate('forflow.dynamicCopy.990d4a54fe', 'Fetch failed. {{value0}}', {
      value0: detail
    })
  }

  if (options?.isFastForward) {
    const detail =
      extractPublishFailureDetail(error.message) ??
      truncateDetail(stripCredentialsFromMessage(error.message))
    return translate('forflow.dynamicCopy.22bfbd95ce', 'Fast-forward failed. {{value0}}', {
      value0: detail
    })
  }

  if (options?.isRebase) {
    const detail =
      extractPublishFailureDetail(error.message) ??
      truncateDetail(stripCredentialsFromMessage(error.message))
    return translate('forflow.dynamicCopy.39af89901f', 'Rebase failed. {{value0}}', {
      value0: detail
    })
  }

  return error.message
}

export { isNonFastForwardRemoteError } from './source-control-remote-error-detail'
