import { translate } from '@/i18n/i18n'
export type WorktreeGitIdentityDisplay =
  | {
      kind: 'branch'
      branchName: string
    }
  | {
      kind: 'detached'
      shortHead: string
      sidebarLabel: string
      sourceControlLabel: string
      tooltip: string
    }

export function shortGitHead(head: string | null | undefined): string {
  return (head ?? '').trim().slice(0, 7)
}

export function getDetachedHeadTooltip(shortHead: string): string {
  return translate(
    'forflow.dynamicCopy.32a7a26fae',
    'Detached HEAD at {{value0}}. You are viewing a commit, not a branch.',
    { value0: shortHead }
  )
}

export function getWorktreeGitIdentityDisplay(input: {
  branch?: string | null
  head?: string | null
}): WorktreeGitIdentityDisplay | null {
  const branchName = (input.branch ?? '').replace(/^refs\/heads\//, '').trim()
  if (branchName) {
    return { kind: 'branch', branchName }
  }

  const shortHead = shortGitHead(input.head)
  if (!shortHead) {
    return null
  }

  return {
    kind: 'detached',
    shortHead,
    sidebarLabel: `Detached HEAD @ ${shortHead}`,
    sourceControlLabel: `Detached HEAD · ${shortHead}`,
    tooltip: getDetachedHeadTooltip(shortHead)
  }
}
