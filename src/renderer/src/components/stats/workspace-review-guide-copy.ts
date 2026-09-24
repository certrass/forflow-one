import { translate } from '@/i18n/i18n'

export function workspaceReviewGuideCopy() {
  return {
    title: translate('forflow.reviewGuide.title', 'Project review guide'),
    description: translate(
      'forflow.reviewGuide.description',
      'Take one step at a time to prepare your review.'
    ),
    projectTitle: translate(
      'forflow.reviewGuide.projectTitle',
      'Which project would you like to check?'
    ),
    projectHint: translate(
      'forflow.reviewGuide.projectHint',
      'Choose a project already open in Forflow One.'
    ),
    projectHelp: translate(
      'forflow.reviewGuide.projectHelp',
      'Click the project selector and choose the folder containing your delivery. If it is missing, open the project from the sidebar and refresh this list. After choosing, the Continue button becomes available.'
    ),
    goalTitle: translate('forflow.reviewGuide.goalTitle', 'What would you like to find out?'),
    goalHint: translate(
      'forflow.reviewGuide.goalHint',
      'Describe what you want to check in one sentence. Next, clarify what would count as complete, or go straight to materials if that is already clear.'
    ),
    goalHelp: translate(
      'forflow.reviewGuide.goalHelp',
      'Choose a common goal above, then edit the text here. For example: after restarting, the issue title and status should stay unchanged. Describe what success looks like; you do not need to write an audit prompt.'
    ),
    filesTitle: translate(
      'forflow.reviewGuide.filesTitle',
      'Which materials help answer that question?'
    ),
    filesHint: translate(
      'forflow.reviewGuide.filesHint',
      'Start with the relevant requirements, implementation and test records.'
    ),
    filesHelp: translate(
      'forflow.reviewGuide.filesHelp',
      'Click a folder name to open it, then check the boxes beside relevant files. Start with a README or requirements document, the implementation being checked, and any existing test record. Selected files appear below.'
    ),
    projectReady: translate(
      'forflow.reviewGuide.projectReady',
      'The project is selected. Check its folder path, then click Continue: choose a goal here. Next you will describe what you want to verify.'
    ),
    goalReady: translate(
      'forflow.reviewGuide.goalReady',
      'Your goal is filled in and can still be edited. When it matches what you want to check, click Continue: choose materials. The next step lets you browse and select files.'
    ),
    filesReady: translate(
      'forflow.reviewGuide.filesReady',
      'Check the selected-file list and each file purpose. Test outputs should be marked as test or build records. Click Enter review here to save a local copy and inspect the evidence. Jev is optional and asks you to preview before sending.'
    ),
    filesUpdateReady: translate(
      'forflow.reviewGuide.filesUpdateReady',
      'Check the selected files and their purpose, then click Update review materials. This rereads the chosen sources into a new saved version, so you can compare changes with the previous review.'
    ),
    nextAction: translate('forflow.reviewGuide.nextAction', 'Next, click here'),
    projectUnavailable: translate(
      'forflow.reviewGuide.projectUnavailable',
      'This project cannot be read here yet. Choose an available local project from this list to continue.'
    ),
    help: translate('forflow.reviewGuide.help', 'Show me this step'),
    closeHelp: translate('forflow.reviewGuide.closeHelp', 'Close this tip'),
    back: translate('forflow.reviewGuide.back', 'Previous step'),
    nextGoal: translate('forflow.reviewGuide.nextGoal', 'Continue: choose a goal'),
    nextFiles: translate('forflow.reviewGuide.nextFiles', 'Continue: choose materials'),
    options: translate(
      'forflow.reviewGuide.options',
      'Add conversations or policy requirements (optional)'
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
