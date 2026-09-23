import { translate } from '@/i18n/i18n'

export function jevGuideCopy() {
  return {
    account: translate('forflow.jevGuide.account', 'Jev account and connection settings'),
    goal: translate('forflow.jevGuide.goal', '1. Decide what to check'),
    materials: translate('forflow.jevGuide.materials', '2. Choose the material'),
    preview: translate('forflow.jevGuide.preview', '3. Check the preview and send'),
    results: translate('forflow.jevGuide.results', '4. Read the result and take action'),
    purpose: translate(
      'forflow.jevGuide.purpose',
      'Jev checks whether the selected material supports one requirement. It does not run tests or inspect the rest of the project.'
    ),
    goalHint: translate(
      'forflow.jevGuide.goalHint',
      'Use one observable result. If the goal below is broad, edit it before continuing.'
    ),
    example: translate(
      'forflow.jevGuide.example',
      'Example: after saving a review and restarting the app, the selected files and review goal are still there.'
    ),
    editGoal: translate('forflow.jevGuide.editGoal', 'Edit this requirement'),
    choose: translate('forflow.jevGuide.choose', 'Choose material for this requirement'),
    materialsHint: translate(
      'forflow.jevGuide.materialsHint',
      'Choose the requirement and records of what actually happened. Include failed results too. A message saying “done” alone is not verification.'
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
    editSources: translate('forflow.jevGuide.editSources', 'Add or replace project material'),
    reread: translate('forflow.jevGuide.reread', 'Reread updated material'),
    previewHint: translate(
      'forflow.jevGuide.previewHint',
      'This preview is still local. Read the requirement and text below; only the send button submits this request to Jev.'
    ),
    questions: translate('forflow.jevGuide.questions', 'What Jev will check'),
    questionList: translate(
      'forflow.jevGuide.questionList',
      'Is the requirement clear? Does the material support it, show failure, lack evidence or conflict? Is a current failure documented? Can someone follow the handoff steps, and do those steps verify this requirement?'
    ),
    resultHint: translate(
      'forflow.jevGuide.resultHint',
      'Start with the main finding and its next action. “Request completed” means an answer arrived, not that the delivery passed.'
    ),
    back: translate('forflow.jevGuide.back', 'Back'),
    history: translate('forflow.jevGuide.history', 'View previous results'),
    again: translate('forflow.jevGuide.again', 'Start another check'),
    help: translate('forflow.jevGuide.help', 'Guide me through Jev'),
    close: translate('forflow.jevGuide.close', 'Hide Jev guidance'),
    goalHelp: translate(
      'forflow.jevGuide.goalHelp',
      'Read this requirement first. If it describes one verifiable result, continue to choose material. Otherwise edit it and save a new review version.'
    ),
    materialHelp: translate(
      'forflow.jevGuide.materialHelp',
      'Tick the material to send. Start with a requirement and an actual result; use the source link to check a record. Your selection stays when you return.'
    ),
    selectedHelp: translate(
      'forflow.jevGuide.selectedHelp',
      'Your selection is ready for a local preview. Preparing it does not send anything. You will inspect the text before deciding to send.'
    ),
    previewHelp: translate(
      'forflow.jevGuide.previewHelp',
      'Check the text and any omissions. Send only when this is the material you want Jev to assess. Back returns to selection without sending.'
    ),
    resultHelp: translate(
      'forflow.jevGuide.resultHelp',
      'Read the main finding below, then verify it against the source. Register a problem or add missing material. A score or probability alone does not approve the review.'
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
