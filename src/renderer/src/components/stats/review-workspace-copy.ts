import { translate } from '@/i18n/i18n'

export function reviewWorkspaceCopy() {
  return {
    overview: translate('forflow.reviewWorkspace.overview', 'Overview and activity'),
    reviewers: translate('forflow.reviewWorkspace.reviewers', 'Reviewers'),
    checks: translate('forflow.reviewWorkspace.checks', 'Checks'),
    status: translate('forflow.reviewWorkspace.status', 'Status'),
    description: translate('forflow.reviewWorkspace.description', 'Description'),
    activity: translate('forflow.reviewWorkspace.activity', 'Activity'),
    start: translate('forflow.reviewWorkspace.start', 'Review with Jev'),
    inspect: translate('forflow.reviewWorkspace.inspect', 'Review this record'),
    noChecks: translate('forflow.reviewWorkspace.noChecks', 'No Jev checks for this version'),
    checkScope: translate(
      'forflow.reviewWorkspace.checkScope',
      'Checks use the selected materials in this version.'
    ),
    checked: translate('forflow.reviewWorkspace.checked', 'Completed checks'),
    attention: translate('forflow.reviewWorkspace.attention', 'Suggestions to inspect'),
    incomplete: translate('forflow.reviewWorkspace.incomplete', 'Pending or incomplete'),
    viewChecks: translate('forflow.reviewWorkspace.viewChecks', 'View checks'),
    saved: translate('forflow.reviewWorkspace.saved', 'Saved source version'),
    issue: translate('forflow.reviewWorkspace.issue', 'Opened an issue'),
    comment: translate('forflow.reviewWorkspace.comment', 'Commented'),
    confirmed: translate('forflow.reviewWorkspace.confirmed', 'Confirmed this version'),
    check: translate('forflow.reviewWorkspace.check', 'Jev record check'),
    viewVersion: translate('forflow.reviewWorkspace.viewVersion', 'View this version'),
    more: translate('forflow.reviewWorkspace.more', 'Show earlier activity'),
    focusChanged: translate(
      'forflow.reviewWorkspace.focusChanged',
      'Read current records to save the changed review focus before running a check.'
    ),
    checkError: translate('forflow.reviewWorkspace.checkError', 'Unable to load Jev checks.'),
    request: translate('forflow.reviewWorkspace.request', 'Full request and question definitions'),
    sentRecord: translate('forflow.reviewWorkspace.sentRecord', 'Selected record'),
    sentResult: translate('forflow.reviewWorkspace.sentResult', 'Linked return'),
    noReturn: translate(
      'forflow.reviewWorkspace.noReturn',
      'No linked return in this source version'
    ),
    partial: translate('forflow.reviewWorkspace.partial', 'This source has coverage gaps'),
    local: translate(
      'forflow.reviewWorkspace.local',
      'Review decisions, Jev results and usage records are saved locally.'
    ),
    goIssues: translate('forflow.reviewWorkspace.goIssues', 'View recorded issues')
  }
}
