import { translate } from '@/i18n/i18n'

export function reviewCopy() {
  return {
    details: translate('forflow.review.details', 'Source details'),
    historicBadge: translate('forflow.review.historicBadge', 'Historical source snapshot'),
    viewResult: translate('forflow.review.viewResult', 'View result'),

    range: translate('forflow.review.range', 'Time range'),
    locate: translate('forflow.review.locate', 'View material'),

    analytics: translate('forflow.review.analytics', 'Analytics · Codex'),
    history: translate('forflow.review.history', 'Usage history'),
    top: translate('forflow.review.top', 'Top chats'),
    topCost: translate('forflow.review.topCost', 'By estimated cost'),
    description: translate(
      'forflow.review.description',
      'Select a session to inspect its records and start a versioned review.'
    ),
    localScope: translate(
      'forflow.review.localScope',
      'Local Codex logs · remote execution is not verified here.'
    ),
    search: translate('forflow.review.search', 'Search chats, projects or models'),
    allProjects: translate('forflow.review.allProjects', 'All projects'),
    project: translate('forflow.review.project', 'Project'),
    chat: translate('forflow.review.chat', 'Chat'),
    model: translate('forflow.review.model', 'Model'),
    tokens: translate('forflow.review.tokens', 'Tokens in period'),
    cost: translate('forflow.review.cost', 'Estimated USD'),
    review: translate('forflow.review.review', 'Review'),
    lastActive: translate('forflow.review.lastActive', 'Last active'),
    unknown: translate('forflow.review.unknown', 'Unknown'),
    partial: translate('forflow.review.partial', 'Partial pricing'),
    periodUnknown: translate('forflow.review.periodUnknown', 'Period attribution unavailable'),
    empty: translate('forflow.review.empty', 'No sessions match these filters.'),
    loading: translate('forflow.review.loading', 'Loading records…'),
    refresh: translate('forflow.review.refresh', 'Refresh records'),
    previous: translate('forflow.review.previous', 'Previous'),
    next: translate('forflow.review.next', 'Next'),
    start: translate('forflow.review.start', 'Start review'),
    open: translate('forflow.review.open', 'Open review'),
    back: translate('forflow.review.back', 'Back to conversations'),
    unavailable: translate(
      'forflow.review.unavailable',
      'This runtime does not support session review. Update the execution host to use this feature.'
    ),
    reviewing: translate('forflow.review.reviewing', 'In review'),
    unreviewed: translate('forflow.review.unreviewed', 'Not reviewed'),
    issues: translate('forflow.review.issues', 'Issues found'),
    hasIssues: translate('forflow.review.hasIssues', 'Open issues'),
    confirmed: translate('forflow.review.confirmed', 'Version confirmed'),
    focus: translate('forflow.review.focus', 'Review focus'),
    defaultFocus: translate(
      'forflow.review.defaultFocus',
      'Inspect model and tool records, unmatched results and source coverage. Draw conclusions only from visible evidence.'
    ),
    reread: translate('forflow.review.reread', 'Refresh materials'),
    confirm: translate('forflow.review.confirm', 'Confirm this version'),
    version: translate('forflow.review.version', 'Version'),
    frozen: translate('forflow.review.frozen', 'Saved material version'),
    manual: translate('forflow.review.manual', 'Review decisions are saved locally.'),
    comments: translate('forflow.review.comments', 'Comments'),
    changes: translate('forflow.review.changes', 'Changes'),
    records: translate('forflow.review.records', 'Records'),
    noIssues: translate('forflow.review.noIssues', 'No issues recorded yet.'),
    issueTitle: translate('forflow.review.issueTitle', 'Issue title'),
    issueDetail: translate('forflow.review.issueDetail', 'Evidence and next step'),
    addIssue: translate('forflow.review.addIssue', 'Add issue'),
    scopeIssue: translate('forflow.review.scopeIssue', 'Attach to review scope'),
    recordIssue: translate('forflow.review.recordIssue', 'Attach to selected record'),
    openStatus: translate('forflow.review.openStatus', 'Open'),
    resolved: translate('forflow.review.resolved', 'Resolved after review'),
    dismissed: translate('forflow.review.dismissed', 'Dismissed with explanation'),
    reopen: translate('forflow.review.reopen', 'Reopen'),
    resolve: translate('forflow.review.resolve', 'Resolve after checking'),
    dismiss: translate('forflow.review.dismiss', 'Dismiss'),
    reason: translate('forflow.review.reason', 'Explain the resolution or exception'),
    apply: translate('forflow.review.apply', 'Save decision'),
    comment: translate('forflow.review.comment', 'Add context, discuss or explain an exception'),
    addComment: translate('forflow.review.addComment', 'Post comment'),
    noComments: translate('forflow.review.noComments', 'No comments yet.'),
    localReviewer: translate('forflow.review.localReviewer', 'Local reviewer'),
    linked: translate('forflow.review.linked', 'Linked and missing'),
    sources: translate('forflow.review.sources', 'Source fragments'),
    context: translate('forflow.review.context', 'Context records'),
    requests: translate('forflow.review.requests', 'Model responses'),
    tools: translate('forflow.review.tools', 'Tool calls'),
    unreturned: translate('forflow.review.unreturned', 'Calls without a visible result'),
    readFailures: translate('forflow.review.readFailures', 'Read failures'),
    damaged: translate('forflow.review.damaged', 'Malformed records'),
    conflicts: translate('forflow.review.conflicts', 'Conflicting record IDs'),
    coverage: translate(
      'forflow.review.coverage',
      'Records cover only the displayed files and byte ranges. Missing returns are evidence gaps, not proof of failed execution.'
    ),
    notLinked: translate(
      'forflow.review.notLinked',
      'Asset versions and controlled data-read receipts are not linked yet.'
    ),
    truncated: translate('forflow.review.truncated', 'Bounded tail read'),
    source: translate('forflow.review.source', 'Source'),
    position: translate('forflow.review.position', 'Position'),
    result: translate('forflow.review.result', 'Return record'),
    found: translate('forflow.review.found', 'Found'),
    notObserved: translate('forflow.review.notObserved', 'Not observed'),
    flag: translate('forflow.review.flag', 'Flag issue'),
    viewSource: translate('forflow.review.viewSource', 'Read source locally'),
    redacted: translate(
      'forflow.review.redacted',
      'Local excerpt; common credentials and email addresses are masked. This is not a complete sensitive-data detector.'
    ),
    excerptTruncated: translate(
      'forflow.review.excerptTruncated',
      'Excerpt truncated for display.'
    ),
    close: translate('forflow.review.close', 'Close'),
    noChanges: translate('forflow.review.noChanges', 'This is the first saved version.'),
    added: translate('forflow.review.added', 'Added records'),
    removed: translate('forflow.review.removed', 'No longer visible'),
    changed: translate('forflow.review.changed', 'Changed records'),
    unchanged: translate('forflow.review.unchanged', 'Unchanged records'),
    changesNote: translate(
      'forflow.review.changesNote',
      'An absent record or issue is not automatically resolved. Review decisions carry forward until explicitly changed.'
    ),
    historic: translate(
      'forflow.review.historic',
      'Viewing an earlier source snapshot. Issue statuses show the current decisions; comments retain their version references. Return to the latest version to make changes.'
    ),
    latest: translate('forflow.review.latest', 'Latest'),
    error: translate('forflow.review.error', 'Unable to read records. Refresh and try again.'),
    saving: translate('forflow.review.saving', 'Saving…'),
    scope: translate('forflow.review.scope', 'Scope'),
    noRecords: translate(
      'forflow.review.noRecords',
      'No matching records were visible in these fragments.'
    ),
    pendingEvidence: translate('forflow.review.pendingEvidence', 'Evidence to follow up'),
    confirmationMeaning: translate(
      'forflow.review.confirmationMeaning',
      'Confirm after reviewing the materials and recorded issues.'
    )
  }
}
