import { translate } from '@/i18n/i18n'

export function reviewIntakeCopy() {
  return {
    clarify: translate('forflow.reviewIntake.clarify', 'What would count as complete?'),
    clarifyHint: translate(
      'forflow.reviewIntake.clarifyHint',
      'Describe one result someone could check. Your answer will become part of the review requirement.'
    ),
    acceptance: translate('forflow.reviewIntake.acceptance', 'Expected result'),
    acceptancePlaceholder: translate(
      'forflow.reviewIntake.acceptancePlaceholder',
      'For example: after saving and restarting, the issue title and status are unchanged.'
    ),
    ask: translate('forflow.reviewIntake.ask', 'Continue: clarify the expected result'),
    describeReady: translate(
      'forflow.reviewIntake.describeReady',
      'Next, describe what would count as complete. If your sentence already includes that result, you can go straight to materials.'
    ),
    direct: translate(
      'forflow.reviewIntake.direct',
      'The expected result is clear; choose materials'
    ),
    unknown: translate('forflow.reviewIntake.unknown', 'Not sure yet; keep this open'),
    unresolved: translate(
      'forflow.reviewIntake.unresolved',
      'Still to be clarified. The acceptance condition has not been agreed.'
    ),
    subject: translate('forflow.reviewIntake.subject', 'What to check'),
    useAnswer: translate(
      'forflow.reviewIntake.useAnswer',
      'Use this requirement and choose materials'
    ),
    confirmReady: translate(
      'forflow.reviewIntake.confirmReady',
      'Check the combined requirement below, then choose “Use this requirement and choose materials”. Nothing has been read or sent yet.'
    ),
    tooLong: translate(
      'forflow.reviewIntake.tooLong',
      'The combined requirement is over 2,000 characters. Shorten the goal or expected result.'
    ),
    materialTitle: translate(
      'forflow.reviewIntake.materialTitle',
      'What material is still needed?'
    ),
    empty: translate(
      'forflow.reviewIntake.empty',
      'Choose the delivery or requirement first, then any record showing what actually happened.'
    ),
    noRun: translate(
      'forflow.reviewIntake.noRun',
      'No selected file is marked as a test or build record. To check whether the requirement was met, add actual test output, an execution log or a recorded manual check. Test code alone is not a test result.'
    ),
    hasRun: translate(
      'forflow.reviewIntake.hasRun',
      'A file is marked as a test or build record. Check its contents and version before treating it as evidence; a file label does not establish that a test passed.'
    ),
    conversations: translate(
      'forflow.reviewIntake.conversations',
      'Linked conversations may contain execution results. Open the actual return or verification record; a message saying “done” is not enough.'
    ),
    beforeRead: translate(
      'forflow.reviewIntake.beforeRead',
      'These hints use the selected file purposes, not their contents. You can enter review with gaps and add material later. Change a file purpose below if its suggested label is wrong.'
    ),
    afterRead: translate(
      'forflow.reviewIntake.afterRead',
      'These hints describe the selected sources, not a quality verdict. Use the source links to check the original text. Add missing material or prepare a preview of what you already have.'
    ),
    preview: translate('forflow.reviewIntake.preview', 'Requirement to save')
  }
}

export function clarifiedReviewFocus(focus: string, acceptance: string): string {
  const c = reviewIntakeCopy()
  return `${c.subject}：${focus.trim()}\n${c.acceptance}：${acceptance.trim()}`
}
