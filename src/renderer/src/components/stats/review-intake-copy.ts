import { translate } from '@/i18n/i18n'

export function reviewIntakeCopy() {
  return {
    clarify: translate('forflow.reviewIntake.clarify', 'What would count as complete?'),
    clarifyHint: translate(
      'forflow.reviewIntake.clarifyHint',
      'Describe a result that someone can check against the materials.'
    ),
    acceptance: translate('forflow.reviewIntake.acceptance', 'Expected result'),
    acceptancePlaceholder: translate(
      'forflow.reviewIntake.acceptancePlaceholder',
      'For example: after saving and restarting, the issue title and status are unchanged.'
    ),
    ask: translate('forflow.reviewIntake.ask', 'Add expected result'),
    describeReady: translate(
      'forflow.reviewIntake.describeReady',
      'Add an expected result, or choose materials directly if the requirement already includes it.'
    ),
    direct: translate('forflow.reviewIntake.direct', 'Choose materials directly'),
    unknown: translate('forflow.reviewIntake.unknown', 'Decide later'),
    unresolved: translate(
      'forflow.reviewIntake.unresolved',
      'Still to be clarified. The acceptance condition has not been agreed.'
    ),
    subject: translate('forflow.reviewIntake.subject', 'What to check'),
    useAnswer: translate('forflow.reviewIntake.useAnswer', 'Next: materials'),
    confirmReady: translate(
      'forflow.reviewIntake.confirmReady',
      'Check the requirement below, then continue to materials.'
    ),
    tooLong: translate(
      'forflow.reviewIntake.tooLong',
      'The combined requirement is over 2,000 characters. Shorten the goal or expected result.'
    ),
    materialTitle: translate('forflow.reviewIntake.materialTitle', 'Material suggestions'),
    empty: translate(
      'forflow.reviewIntake.empty',
      'Start with a requirement and its implementation or output.'
    ),
    noRun: translate(
      'forflow.reviewIntake.noRun',
      'To check how it ran, add test output or an operation record.'
    ),
    hasRun: translate(
      'forflow.reviewIntake.hasRun',
      'Test or build records selected. Compare their results and versions during review.'
    ),
    conversations: translate(
      'forflow.reviewIntake.conversations',
      'Open linked conversations to find the relevant requirements and execution results.'
    ),
    beforeRead: translate(
      'forflow.reviewIntake.beforeRead',
      'File purposes can be adjusted below. More materials can be added later.'
    ),
    afterRead: translate(
      'forflow.reviewIntake.afterRead',
      'Open a material to check its text, or continue to the sending preview.'
    ),
    preview: translate('forflow.reviewIntake.preview', 'Review requirement')
  }
}

export function clarifiedReviewFocus(focus: string, acceptance: string): string {
  const c = reviewIntakeCopy()
  return `${c.subject}：${focus.trim()}\n${c.acceptance}：${acceptance.trim()}`
}
