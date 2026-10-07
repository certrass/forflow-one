import { translate } from '@/i18n/i18n'

export function jevGuideCopy() {
  return {
    account: translate('forflow.jevGuide.account', 'Jev account and connection settings'),
    goal: translate('forflow.jevGuide.goal', 'Review requirement'),
    materials: translate('forflow.jevGuide.materials', 'Choose materials'),
    preview: translate('forflow.jevGuide.preview', 'Confirm and send'),
    results: translate('forflow.jevGuide.results', 'Review results'),
    purpose: translate(
      'forflow.jevGuide.purpose',
      'Use Jev to compare selected materials with your review requirement.'
    ),
    goalHint: translate(
      'forflow.jevGuide.goalHint',
      'Confirm the requirement below, or edit it before choosing materials.'
    ),
    example: translate(
      'forflow.jevGuide.example',
      'Example: after saving a review and restarting the app, the selected files and review goal are still there.'
    ),
    editGoal: translate('forflow.jevGuide.editGoal', 'Edit this requirement'),
    choose: translate('forflow.jevGuide.choose', 'Next: materials'),
    materialsHint: translate(
      'forflow.jevGuide.materialsHint',
      'Choose the requirement and its results, including any failed runs.'
    ),
    requirementMaterial: translate(
      'forflow.jevGuide.requirementMaterial',
      'Requirement: a specification or conversation saying what should happen.'
    ),
    resultMaterial: translate(
      'forflow.jevGuide.resultMaterial',
      'Actual result: test output, execution logs or a delivery record for this version.'
    ),
    handoffMaterial: translate(
      'forflow.jevGuide.handoffMaterial',
      'Verification steps (optional): instructions another person can follow. Select “Use as handoff instructions” only for these.'
    ),
    editSources: translate('forflow.jevGuide.editSources', 'Change materials'),
    reread: translate('forflow.jevGuide.reread', 'Refresh material contents'),
    previewHint: translate(
      'forflow.jevGuide.previewHint',
      'Check the text below. Confirming sends it to Jev.'
    ),
    questions: translate('forflow.jevGuide.questions', 'What Jev will check'),
    questionList: translate(
      'forflow.jevGuide.questionList',
      'Is the requirement clear? Does the material support it, show failure, lack evidence or conflict? Is a current failure documented? Can someone follow the handoff steps, and do those steps verify this requirement?'
    ),
    resultHint: translate(
      'forflow.jevGuide.resultHint',
      'Review the finding and suggested next action.'
    ),
    back: translate('forflow.jevGuide.back', 'Back'),
    history: translate('forflow.jevGuide.history', 'View previous results'),
    again: translate('forflow.jevGuide.again', 'Start another check'),
    help: translate('forflow.jevGuide.help', 'Step help'),
    close: translate('forflow.jevGuide.close', 'Hide Jev guidance'),
    goalHelp: translate(
      'forflow.jevGuide.goalHelp',
      'Confirm this requirement, or edit it and save the updated version.'
    ),
    materialHelp: translate(
      'forflow.jevGuide.materialHelp',
      'Select the requirement and actual results. Your selection stays when you go back.'
    ),
    selectedHelp: translate(
      'forflow.jevGuide.selectedHelp',
      'Continue to preview the selected text before sending.'
    ),
    previewHelp: translate(
      'forflow.jevGuide.previewHelp',
      'Check the text and any omissions. Go back to change materials or confirm to send.'
    ),
    resultHelp: translate(
      'forflow.jevGuide.resultHelp',
      'Compare the finding with its sources, then record an issue or add materials.'
    ),
    recordHint: translate(
      'forflow.jevGuide.recordHint',
      'This mode checks one record and its linked return. Use Delivery quality to compare several pieces of material with a requirement.'
    ),
    preparing: translate('forflow.jevGuide.preparing', 'Preparing a local preview…'),
    sending: translate('forflow.jevGuide.sending', 'Waiting for Jev’s result…'),
    recording: translate('forflow.jevGuide.recording', 'Recording this issue…')
  }
}
