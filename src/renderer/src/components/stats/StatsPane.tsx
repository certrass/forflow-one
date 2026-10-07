import { useState } from 'react'
import type { CodexReview } from '../../../../shared/codex-review-types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { StatsOverviewTab } from './StatsOverviewTab'
import { CodexAnalyticsPanel } from './CodexAnalyticsPanel'
import { CodexReviewWorkspace } from './CodexReviewWorkspace'
import { usageWorkspaceCopy } from './usage-workspace-copy'
import { workspaceReviewCopy } from './workspace-review-copy'
import { WorkspaceReviewIntake } from './WorkspaceReviewIntake'
export { getStatsPaneSearchEntries } from './stats-search'

export function StatsPane({ reviewOnly = false }: { reviewOnly?: boolean }): React.JSX.Element {
  const c = usageWorkspaceCopy()
  const w = workspaceReviewCopy()
  const [tab, setTab] = useState(reviewOnly ? 'review' : 'overview')
  const [review, setReview] = useState<CodexReview | null>(null)
  const [revision, setRevision] = useState(0)
  const [objectType, setObjectType] = useState(reviewOnly ? 'workspace' : 'conversation')
  const openReview = (value: CodexReview): void => {
    setReview(value)
    setObjectType(value.versions.at(-1)?.workspace ? 'workspace' : 'conversation')
    setTab('review')
  }
  const reviewContent = (
    <>
      {!review && (
        <div className="mb-4">
          <Tabs value={objectType} onValueChange={setObjectType}>
            <TabsList aria-label={w.objectType}>
              <TabsTrigger value="workspace">{w.workspaces}</TabsTrigger>
              <TabsTrigger value="conversation">{w.conversations}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      {review ? (
        <CodexReviewWorkspace
          key={`${review.id}:${review.revision}:${review.versions.at(-1)?.id}`}
          active={tab === 'review'}
          initial={review}
          onBack={() => {
            setReview(null)
            setRevision((value) => value + 1)
            setTab(reviewOnly || objectType === 'workspace' ? 'review' : 'analytics')
          }}
        />
      ) : objectType === 'workspace' ? (
        <WorkspaceReviewIntake
          active={tab === 'review'}
          onOpenReview={openReview}
          embedded={reviewOnly}
        />
      ) : (
        <CodexAnalyticsPanel
          active={tab === 'review'}
          mode="review"
          onOpenReview={openReview}
          revision={revision}
        />
      )}
    </>
  )
  if (reviewOnly) {
    return (
      <div className="min-w-0" data-testid="usage-workspace">
        {reviewContent}
      </div>
    )
  }
  return (
    <Tabs value={tab} onValueChange={setTab} className="min-w-0" data-testid="usage-workspace">
      <div className="border-b border-border pb-1">
        <TabsList variant="line" aria-label={c.navigation}>
          <TabsTrigger value="overview">{c.overview}</TabsTrigger>
          <TabsTrigger value="analytics">{c.analytics}</TabsTrigger>
          <TabsTrigger value="review">{c.review}</TabsTrigger>
        </TabsList>
      </div>
      <>
        <TabsContent value="overview" className="mt-4">
          <StatsOverviewTab />
        </TabsContent>
        <TabsContent value="analytics" forceMount className="mt-4 data-[state=inactive]:hidden">
          <CodexAnalyticsPanel
            active={tab === 'analytics'}
            onOpenReview={openReview}
            revision={revision}
          />
        </TabsContent>
      </>
      <TabsContent value="review" forceMount className="mt-4 data-[state=inactive]:hidden">
        {reviewContent}
      </TabsContent>
    </Tabs>
  )
}
