import { translate } from '@/i18n/i18n'

export function workspaceReviewGuideCopy() {
  return {
    refresh: translate('forflow.reviewGuide.refresh', 'Refresh projects'),
    title: translate('forflow.reviewGuide.title', 'Start a project review'),
    description: translate(
      'forflow.reviewGuide.description',
      'Choose a project, describe the requirement, then select materials.'
    ),
    projectTitle: translate('forflow.reviewGuide.projectTitle', 'Choose project'),
    projectHint: translate(
      'forflow.reviewGuide.projectHint',
      'Choose a project already open in Forflow One.'
    ),
    projectHelp: translate(
      'forflow.reviewGuide.projectHelp',
      'Choose an open project. If it is missing, open it from the sidebar and refresh the list.'
    ),
    goalTitle: translate('forflow.reviewGuide.goalTitle', 'Review requirement'),
    goalHint: translate(
      'forflow.reviewGuide.goalHint',
      'Describe what to check and the result you expect.'
    ),
    goalHelp: translate(
      'forflow.reviewGuide.goalHelp',
      'Use a template or describe the expected behavior. For example: the issue title and status remain unchanged after restarting.'
    ),
    filesTitle: translate('forflow.reviewGuide.filesTitle', 'Choose materials'),
    filesHint: translate(
      'forflow.reviewGuide.filesHint',
      'Select requirements, implementation files and test records. Up to 40 files.'
    ),
    filesHelp: translate(
      'forflow.reviewGuide.filesHelp',
      'Open a folder and select relevant files. Adjust each file purpose in the selected list below.'
    ),
    projectReady: translate(
      'forflow.reviewGuide.projectReady',
      'Project selected. Continue to describe the review requirement.'
    ),
    goalReady: translate(
      'forflow.reviewGuide.goalReady',
      'Check the requirement, then continue to choose materials.'
    ),
    filesReady: translate(
      'forflow.reviewGuide.filesReady',
      'Check the file list and purposes, then start the review.'
    ),
    filesUpdateReady: translate(
      'forflow.reviewGuide.filesUpdateReady',
      'Save the selected materials as a new review version.'
    ),
    nextAction: translate('forflow.reviewGuide.nextAction', 'Ready to continue'),
    projectUnavailable: translate(
      'forflow.reviewGuide.projectUnavailable',
      'This project cannot be read here yet. Choose an available local project from this list to continue.'
    ),
    help: translate('forflow.reviewGuide.help', 'Step help'),
    closeHelp: translate('forflow.reviewGuide.closeHelp', 'Close this tip'),
    back: translate('forflow.reviewGuide.back', 'Back'),
    nextGoal: translate('forflow.reviewGuide.nextGoal', 'Next: requirement'),
    nextFiles: translate('forflow.reviewGuide.nextFiles', 'Next: materials'),
    options: translate(
      'forflow.reviewGuide.options',
      'Conversations and policy requirements (optional)'
    ),
    selectedProject: translate('forflow.reviewGuide.selectedProject', 'Project'),
    presets: [
      {
        label: translate('forflow.reviewGuide.handoffLabel', 'Check delivery materials'),
        goal: translate(
          'forflow.reviewGuide.handoffGoal',
          'A colleague should be able to run and review the delivery using its instructions, with expected results, operation steps and matching verification records.'
        )
      },
      {
        label: translate('forflow.reviewGuide.fixLabel', 'Verify a fix'),
        goal: translate(
          'forflow.reviewGuide.fixGoal',
          'The original issue should no longer occur when the reproduction steps are repeated, with verification records tied to the current version.'
        )
      },
      {
        label: translate('forflow.reviewGuide.requirementsLabel', 'Check against requirements'),
        goal: translate(
          'forflow.reviewGuide.requirementsGoal',
          'The delivery should match the behavior agreed in the selected requirements, with corresponding implementation and verifiable test records.'
        )
      }
    ]
  }
}
