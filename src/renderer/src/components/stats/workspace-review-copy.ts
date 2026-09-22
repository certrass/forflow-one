import { translate } from '@/i18n/i18n'

export function workspaceReviewCopy() {
  return {
    targetChanged: translate(
      'forflow.workspaceReview.targetChanged',
      'The project location or execution environment changed. Previous materials were cleared; enter the goal and select files again.'
    ),
    update: translate('forflow.workspaceReview.update', 'Update review materials'),
    policySource: translate(
      'forflow.workspaceReview.policySource',
      'Policy title, version and requirements'
    ),
    optionalPolicy: translate(
      'forflow.workspaceReview.optionalPolicy',
      'Check policy requirements (optional)'
    ),
    optionalSessions: translate(
      'forflow.workspaceReview.optionalSessions',
      'Add development conversations (optional)'
    ),
    focusPlaceholder: translate(
      'forflow.workspaceReview.focusPlaceholder',
      'For example: After adding an issue and restarting, its title and status should still be there.'
    ),
    filesStep: translate('forflow.workspaceReview.filesStep', '3. Select review materials'),
    focusStep: translate('forflow.workspaceReview.focusStep', '2. What do you want to check?'),
    targetStep: translate('forflow.workspaceReview.targetStep', '1. Choose a project'),
    conversations: translate('forflow.workspaceReview.conversations', 'Conversations'),
    workspaces: translate('forflow.workspaceReview.workspaces', 'Projects'),
    objectType: translate('forflow.workspaceReview.objectType', 'Review object'),
    title: translate('forflow.workspaceReview.title', 'Project review'),
    description: translate(
      'forflow.workspaceReview.description',
      'Choose a project and materials to check against your delivery requirements.'
    ),
    target: translate('forflow.workspaceReview.target', 'Project'),
    chooseTarget: translate('forflow.workspaceReview.chooseTarget', 'Choose a project'),
    searchTargets: translate('forflow.workspaceReview.searchTargets', 'Search projects'),
    noTargets: translate(
      'forflow.workspaceReview.noTargets',
      'Open a local project in Forflow One, then refresh this list.'
    ),
    unavailable: translate(
      'forflow.workspaceReview.unavailable',
      'This runtime does not support workspace reviews. Update the execution host.'
    ),
    unsupported: translate(
      'forflow.workspaceReview.unsupported',
      'This workspace cannot be read by the local review reader.'
    ),
    local: translate('forflow.workspaceReview.local', 'Local workspace'),
    git: translate('forflow.workspaceReview.git', 'Git worktree'),
    folder: translate('forflow.workspaceReview.folder', 'Folder workspace'),
    files: translate('forflow.workspaceReview.files', 'Review materials'),
    fileNote: translate(
      'forflow.workspaceReview.fileNote',
      'Select relevant code, instructions or test records. Up to 40 files.'
    ),
    code: translate('forflow.workspaceReview.code', 'Code'),
    document: translate('forflow.workspaceReview.document', 'Documents and requirements'),
    verification: translate('forflow.workspaceReview.verification', 'Test and build receipts'),
    focus: translate('forflow.workspaceReview.focus', 'Review goal'),
    focusHint: translate(
      'forflow.workspaceReview.focusHint',
      'Describe one specific expected result for this review.'
    ),
    sessions: translate('forflow.workspaceReview.sessions', 'Development conversations'),
    sessionNote: translate(
      'forflow.workspaceReview.sessionNote',
      'Add conversations that explain the requirements or implementation. Optional, up to 12.'
    ),
    searchSessions: translate('forflow.workspaceReview.searchSessions', 'Search conversations'),
    noSessions: translate(
      'forflow.workspaceReview.noSessions',
      'No conversations are available. Enable Codex analytics to read local logs.'
    ),
    selected: translate('forflow.workspaceReview.selected', 'Selected'),
    remove: translate('forflow.workspaceReview.remove', 'Remove'),
    policy: translate('forflow.workspaceReview.policy', 'Policy requirements'),
    policyHint: translate(
      'forflow.workspaceReview.policyHint',
      'Add this only when checking specific policies or compliance requirements. Include the document title, version and relevant requirements.'
    ),
    applicability: translate('forflow.workspaceReview.applicability', 'Policy applicability'),
    unconfirmed: translate('forflow.workspaceReview.unconfirmed', 'Unconfirmed'),
    applies: translate('forflow.workspaceReview.applies', 'Applies'),
    notApplicable: translate('forflow.workspaceReview.notApplicable', 'Not applicable'),
    applicabilityReason: translate(
      'forflow.workspaceReview.applicabilityReason',
      'Applicability basis and reason'
    ),
    prepare: translate('forflow.workspaceReview.prepare', 'Open review'),
    preparing: translate('forflow.workspaceReview.preparing', 'Preparing review materials…'),
    prepareNote: translate(
      'forflow.workspaceReview.prepareNote',
      'Next, inspect materials, record issues and use Jev for additional judgments. You will see the exact text before sending it.'
    ),
    fileLimit: translate('forflow.workspaceReview.fileLimit', 'Select 1–40 files.'),
    required: translate(
      'forflow.workspaceReview.required',
      'Choose an available project and describe your review goal.'
    ),
    reasonRequired: translate(
      'forflow.workspaceReview.reasonRequired',
      'Record a reason before marking the policy not applicable.'
    ),
    duplicate: translate(
      'forflow.workspaceReview.duplicate',
      'Each file path should appear only once. Choose the category that fits its role.'
    ),
    saved: translate('forflow.workspaceReview.saved', 'Recent project reviews'),
    noSaved: translate(
      'forflow.workspaceReview.noSaved',
      'No reviews yet. Choose a project and materials above to get started.'
    ),
    back: translate('forflow.workspaceReview.back', 'Back to project reviews'),
    snapshot: translate('forflow.workspaceReview.snapshot', 'Materials and versions'),
    fileStatus: translate('forflow.workspaceReview.fileStatus', 'Read status'),
    read: translate('forflow.workspaceReview.read', 'Read'),
    missing: translate('forflow.workspaceReview.missing', 'Missing'),
    unreadable: translate('forflow.workspaceReview.unreadable', 'Unreadable'),
    tooLarge: translate('forflow.workspaceReview.tooLarge', 'Exceeds read limit'),
    binary: translate('forflow.workspaceReview.binary', 'Non-text file'),
    unsafe: translate('forflow.workspaceReview.unsafe', 'Outside allowed scope'),
    noBody: translate(
      'forflow.workspaceReview.noBody',
      'No readable text was saved for this file.'
    ),
    excerpt: translate(
      'forflow.workspaceReview.excerpt',
      'Text excerpt with common sensitive values masked; source hash checked.'
    ),
    signals: translate('forflow.workspaceReview.signals', 'Local sensitive-content signals'),
    credential: translate('forflow.workspaceReview.credential', 'Possible credential'),
    personalData: translate('forflow.workspaceReview.personalData', 'Possible personal data'),
    confidentialMarker: translate(
      'forflow.workspaceReview.confidentialMarker',
      'Confidentiality marker'
    ),
    signalNote: translate(
      'forflow.workspaceReview.signalNote',
      'These are content signals, not findings of unauthorized disclosure. Destination, transfer outcome and authorization remain unknown.'
    ),
    flowUnknown: translate('forflow.workspaceReview.flowUnknown', 'Transfer: unknown'),
    authorizationUnknown: translate(
      'forflow.workspaceReview.authorizationUnknown',
      'Authorization: unknown'
    ),
    noSignals: translate(
      'forflow.workspaceReview.noSignals',
      'No matching signals were observed in the selected readable text.'
    ),
    sourceCoverage: translate(
      'forflow.workspaceReview.sourceCoverage',
      'Selected evidence and gaps'
    ),
    gaps: translate('forflow.workspaceReview.gaps', 'Evidence gaps'),
    hash: translate('forflow.workspaceReview.hash', 'Content hash'),
    head: translate('forflow.workspaceReview.head', 'Git revision'),
    branch: translate('forflow.workspaceReview.branch', 'Branch'),
    gitChanges: translate('forflow.workspaceReview.gitChanges', 'Git changes'),
    gitNote: translate(
      'forflow.workspaceReview.gitNote',
      'Git status identifies changed paths; only selected file contents enter this review.'
    ),
    readOnlyNote: translate(
      'forflow.workspaceReview.readOnlyNote',
      'Verification files are saved evidence. Their presence does not prove that checks cover this snapshot.'
    ),
    jevScope: translate(
      'forflow.workspaceReview.jevScope',
      'Jev checks cover selected readable text, not the entire workspace or a compliance determination.'
    ),
    fileChanges: translate('forflow.workspaceReview.fileChanges', 'Selected file changes'),
    unchanged: translate('forflow.workspaceReview.unchanged', 'Same observed content'),
    unverified: translate('forflow.workspaceReview.unverified', 'Unable to compare contents'),
    ruleVersion: translate('forflow.workspaceReview.ruleVersion', 'Detection rule version'),
    emptyPolicy: translate('forflow.workspaceReview.emptyPolicy', 'No policy source recorded'),
    editScope: translate('forflow.workspaceReview.editScope', 'Edit selected evidence'),
    unknown: translate('forflow.workspaceReview.unknown', 'Unknown')
  }
}
