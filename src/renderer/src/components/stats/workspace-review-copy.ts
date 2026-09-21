import { translate } from '@/i18n/i18n'

export function workspaceReviewCopy() {
  return {
    conversations: translate('forflow.workspaceReview.conversations', 'Conversations'),
    workspaces: translate('forflow.workspaceReview.workspaces', 'Development workspaces'),
    objectType: translate('forflow.workspaceReview.objectType', 'Review object'),
    title: translate('forflow.workspaceReview.title', 'Review a development workspace'),
    description: translate(
      'forflow.workspaceReview.description',
      'Select a registered workspace, files and related conversations to save a local review snapshot.'
    ),
    target: translate('forflow.workspaceReview.target', 'Workspace'),
    chooseTarget: translate('forflow.workspaceReview.chooseTarget', 'Choose a workspace'),
    searchTargets: translate('forflow.workspaceReview.searchTargets', 'Search workspaces'),
    noTargets: translate('forflow.workspaceReview.noTargets', 'No registered workspaces found.'),
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
    files: translate('forflow.workspaceReview.files', 'Selected files'),
    fileNote: translate(
      'forflow.workspaceReview.fileNote',
      'Enter paths relative to this workspace, one per line, up to 40 files. Only these files are read; the whole workspace is not scanned.'
    ),
    code: translate('forflow.workspaceReview.code', 'Code'),
    document: translate('forflow.workspaceReview.document', 'Documents and requirements'),
    verification: translate('forflow.workspaceReview.verification', 'Test and build receipts'),
    focus: translate('forflow.workspaceReview.focus', 'Goal and review questions'),
    focusHint: translate(
      'forflow.workspaceReview.focusHint',
      'State the intended result, acceptance criteria and questions this evidence should answer.'
    ),
    sessions: translate('forflow.workspaceReview.sessions', 'Related Codex conversations'),
    sessionNote: translate(
      'forflow.workspaceReview.sessionNote',
      'Select up to 12 conversations explicitly. Matching names do not establish project membership.'
    ),
    searchSessions: translate('forflow.workspaceReview.searchSessions', 'Search conversations'),
    noSessions: translate(
      'forflow.workspaceReview.noSessions',
      'No conversations are available. Enable Codex analytics to read local logs.'
    ),
    selected: translate('forflow.workspaceReview.selected', 'Selected'),
    remove: translate('forflow.workspaceReview.remove', 'Remove'),
    policy: translate('forflow.workspaceReview.policy', 'Applicable policy and source version'),
    policyHint: translate(
      'forflow.workspaceReview.policyHint',
      'Record the policy title, version and relevant requirements. Add the source document to the file list when available.'
    ),
    applicability: translate('forflow.workspaceReview.applicability', 'Policy applicability'),
    unconfirmed: translate('forflow.workspaceReview.unconfirmed', 'Unconfirmed'),
    applies: translate('forflow.workspaceReview.applies', 'Applies'),
    notApplicable: translate('forflow.workspaceReview.notApplicable', 'Not applicable'),
    applicabilityReason: translate(
      'forflow.workspaceReview.applicabilityReason',
      'Applicability basis and reason'
    ),
    prepare: translate('forflow.workspaceReview.prepare', 'Save local review snapshot'),
    preparing: translate('forflow.workspaceReview.preparing', 'Reading selected evidence…'),
    prepareNote: translate(
      'forflow.workspaceReview.prepareNote',
      'This action reads local evidence. Sending selected text to Jev is a separate preview and confirmation.'
    ),
    fileLimit: translate(
      'forflow.workspaceReview.fileLimit',
      'Select between 1 and 40 file paths.'
    ),
    required: translate(
      'forflow.workspaceReview.required',
      'Choose an available workspace and enter the goal and review questions.'
    ),
    reasonRequired: translate(
      'forflow.workspaceReview.reasonRequired',
      'Record a reason before marking the policy not applicable.'
    ),
    duplicate: translate(
      'forflow.workspaceReview.duplicate',
      'Each file path should appear only once. Choose the category that fits its role.'
    ),
    saved: translate('forflow.workspaceReview.saved', 'Saved workspace reviews'),
    noSaved: translate(
      'forflow.workspaceReview.noSaved',
      'No workspace review snapshots saved yet.'
    ),
    back: translate('forflow.workspaceReview.back', 'Back to workspace reviews'),
    snapshot: translate('forflow.workspaceReview.snapshot', 'Selected evidence snapshot'),
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
