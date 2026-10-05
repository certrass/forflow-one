import type { WorkspaceReviewQuery } from '../../../../shared/workspace-review-types'
import { reviewIntakeCopy } from './review-intake-copy'

export function ReviewEvidenceNeeds({
  files,
  hasConversations
}: {
  files: WorkspaceReviewQuery['selection']['files']
  hasConversations: boolean
}): React.JSX.Element {
  const c = reviewIntakeCopy()
  const hasRun = files.some((file) => file.kind === 'verification')
  return (
    <section className="space-y-2" data-testid="review-evidence-needs" aria-live="polite">
      <p className="text-sm text-muted-foreground">
        {files.length === 0 && !hasConversations ? c.empty : hasRun ? c.hasRun : c.noRun}
      </p>
      {hasConversations && <p className="text-sm text-muted-foreground">{c.conversations}</p>}
    </section>
  )
}
