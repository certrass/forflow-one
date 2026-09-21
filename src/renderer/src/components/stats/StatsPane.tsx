import { useState } from 'react'
import type { CodexReview } from '../../../../shared/codex-review-types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { StatsOverviewTab } from './StatsOverviewTab'
import { CodexAnalyticsPanel } from './CodexAnalyticsPanel'
import { CodexReviewWorkspace } from './CodexReviewWorkspace'
import { usageWorkspaceCopy } from './usage-workspace-copy'
export { getStatsPaneSearchEntries } from './stats-search'

export function StatsPane(): React.JSX.Element {
  const c = usageWorkspaceCopy()
  const [tab, setTab] = useState('overview')
  const [review, setReview] = useState<CodexReview | null>(null)
  const [revision, setRevision] = useState(0)
  const openReview = (value: CodexReview): void => {
    setReview(value)
    setTab('review')
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
      <TabsContent value="review" forceMount className="mt-4 data-[state=inactive]:hidden">
        {review ? (
          <CodexReviewWorkspace
            key={`${review.id}:${review.revision}:${review.versions.at(-1)?.id}`}
            initial={review}
            onBack={() => {
              setReview(null)
              setRevision((value) => value + 1)
              setTab('analytics')
            }}
          />
        ) : (
          <CodexAnalyticsPanel
            active={tab === 'review'}
            mode="review"
            onOpenReview={openReview}
            revision={revision}
          />
        )}
      </TabsContent>
    </Tabs>
  )
}
