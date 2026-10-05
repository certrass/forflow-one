import type { WorkspaceReviewQuery } from '../../../../shared/workspace-review-types'

export type WorkspaceReviewFileSelection = WorkspaceReviewQuery['selection']['files']
export type WorkspaceReviewFilePurpose = WorkspaceReviewFileSelection[number]['kind']

export function suggestedReviewFilePurpose(path: string): WorkspaceReviewFilePurpose {
  if (/\.(log|tap|trx|junit)$/i.test(path)) {
    return 'verification'
  }
  if (
    /\.(tsx?|jsx?|mjs|cjs|py|rs|go|java|kt|swift|c|h|cpp|cs|rb|php|vue|svelte|css|scss|html|sh|sql|ya?ml|toml)$/i.test(
      path
    )
  ) {
    return 'code'
  }
  return 'document'
}

export function isReviewFilePurpose(value: string): value is WorkspaceReviewFilePurpose {
  return value === 'code' || value === 'document' || value === 'verification'
}
