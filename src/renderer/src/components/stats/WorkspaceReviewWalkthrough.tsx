import { useRef, type RefObject } from 'react'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import { WorkspaceReviewStepHelp } from './WorkspaceReviewStepHelp'

type ReviewTab = 'overview' | 'records' | 'issues' | 'jev' | 'changes'
type ReviewAnchors = Record<ReviewTab, RefObject<HTMLButtonElement | null>>

export function useReviewWalkthroughAnchors(): ReviewAnchors {
  const overview = useRef<HTMLButtonElement>(null)
  const records = useRef<HTMLButtonElement>(null)
  const issues = useRef<HTMLButtonElement>(null)
  const jev = useRef<HTMLButtonElement>(null)
  const changes = useRef<HTMLButtonElement>(null)
  return { overview, records, issues, jev, changes }
}

function walkthroughCopy() {
  return {
    label: translate('forflow.reviewWalkthrough.label', 'Walk me through this review'),
    close: translate('forflow.reviewWalkthrough.close', 'Hide guidance'),
    records: translate('forflow.reviewWalkthrough.records', 'Open source records'),
    issues: translate('forflow.reviewWalkthrough.issues', 'Open issue list'),
    jev: translate('forflow.reviewWalkthrough.jev', 'Open Jev (optional)'),
    changes: translate('forflow.reviewWalkthrough.changes', 'Compare saved versions'),
    overviewTitle: translate(
      'forflow.reviewWalkthrough.overviewTitle',
      'Start with the source material'
    ),
    overviewBody: translate(
      'forflow.reviewWalkthrough.overviewBody',
      'Check the goal, project path and file read counts below. Missing or unreadable material is a gap to investigate. Then open Records to inspect what the files actually say.'
    ),
    recordsTitle: translate(
      'forflow.reviewWalkthrough.recordsTitle',
      'Read a source, then mark a gap'
    ),
    recordsBody: translate(
      'forflow.reviewWalkthrough.recordsBody',
      'Choose a file below and click Read source locally. Compare its contents with the review goal. If evidence is missing or contradicts the goal, click Flag issue on that file; the issue form will retain its source link.'
    ),
    issuesTitle: translate(
      'forflow.reviewWalkthrough.issuesTitle',
      'Save a specific, traceable issue'
    ),
    issuesBody: translate(
      'forflow.reviewWalkthrough.issuesBody',
      'Enter an issue title, then describe the expected result, what you observed and where the evidence is. Click Add issue to save it. After checking a fix, record a resolution with a reason.'
    ),
    jevTitle: translate('forflow.reviewWalkthrough.jevTitle', 'Choose what Jev will receive'),
    jevBody: translate(
      'forflow.reviewWalkthrough.jevBody',
      'The review can contain up to 40 files; a Delivery quality request uses only the 1–12 sources you select here. Mark actual operating instructions as handoff instructions. Prepare a preview and read the exact redacted text. Sending requires your separate click on Send this preview to Jev. Review results against the sources before recording issues; they do not confirm acceptance.'
    ),
    recordBody: translate(
      'forflow.reviewWalkthrough.recordBody',
      'This entry checks a single record. Inspect the selected record and linked return, and add a claim if needed. For multiple sources, choose Delivery quality and select 1–12 sources. Prepare a preview and inspect it before deciding whether to send it to Jev. Results still require your review.'
    ),
    changesTitle: translate(
      'forflow.reviewWalkthrough.changesTitle',
      'Reread after a change, then compare'
    ),
    changesBody: translate(
      'forflow.reviewWalkthrough.changesBody',
      'After editing files or the goal, use Read current records at the top to save a new version. This tab compares it with the previous saved version; the first version has nothing to compare. Recheck changed sources and unresolved issues before confirming the current version.'
    ),
    historyTitle: translate('forflow.reviewWalkthrough.historyTitle', 'Inspect a saved version'),
    historyBody: translate(
      'forflow.reviewWalkthrough.historyBody',
      'You are viewing an earlier version. Inspect its source records and compare saved versions. Choose the latest version in the version selector before recording issues, running Jev or confirming a review.'
    )
  }
}

export function WorkspaceReviewWalkthrough({
  active = true,
  tab,
  anchors,
  disabled,
  readOnly,
  hasJev,
  singleRecord,
  onTab
}: {
  active?: boolean
  tab: string
  anchors: ReviewAnchors
  disabled: boolean
  readOnly: boolean
  hasJev: boolean
  singleRecord: boolean
  onTab: (tab: string) => void
}): React.JSX.Element {
  const c = walkthroughCopy()
  const current: ReviewTab =
    tab === 'records' || tab === 'issues' || tab === 'changes' || (tab === 'jev' && hasJev)
      ? tab
      : 'overview'
  const steps: ReviewTab[] = hasJev
    ? ['overview', 'records', 'issues', 'jev', 'changes']
    : ['overview', 'records', 'issues', 'changes']
  const content = {
    overview: { title: c.overviewTitle, body: c.overviewBody },
    records: { title: c.recordsTitle, body: c.recordsBody },
    issues: { title: c.issuesTitle, body: c.issuesBody },
    jev: { title: c.jevTitle, body: singleRecord ? c.recordBody : c.jevBody },
    changes: { title: c.changesTitle, body: c.changesBody }
  }
  const nextTabs: Record<ReviewTab, ReviewTab> = {
    overview: 'records',
    records: 'issues',
    issues: hasJev ? 'jev' : 'changes',
    jev: 'issues',
    changes: 'records'
  }
  const next = readOnly ? (current === 'records' ? 'changes' : 'records') : nextTabs[current]
  const actionLabels = {
    overview: c.records,
    records: c.records,
    issues: c.issues,
    jev: c.jev,
    changes: c.changes
  }
  return (
    <WorkspaceReviewStepHelp
      active={active}
      anchorRef={anchors[current === 'overview' ? 'records' : current]}
      title={readOnly ? c.historyTitle : content[current].title}
      body={readOnly ? c.historyBody : content[current].body}
      label={c.label}
      closeLabel={c.close}
      progress={{ current: steps.indexOf(current) + 1, total: steps.length }}
      placement="top"
      actions={
        <Button type="button" size="xs" disabled={disabled} onClick={() => onTab(next)}>
          {actionLabels[next]}
        </Button>
      }
    />
  )
}
