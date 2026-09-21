import { translate } from '@/i18n/i18n'

export function jevAuditCopy() {
  return {
    title: translate('forflow.jev.title', 'Jev audit · Beta'),
    scope: translate(
      'forflow.jev.scope',
      'Review one selected local record and its linked return. Suggestions apply only to this evidence and require human review.'
    ),
    external: translate(
      'forflow.jev.external',
      'Sending transmits the preview to Typesafe’s cloud API and may incur charges. Automatic redaction covers common secrets and email addresses; inspect the content before sending.'
    ),
    record: translate('forflow.jev.record', 'Record to review'),
    claim: translate('forflow.jev.claim', 'Claim to verify (optional)'),
    claimHint: translate(
      'forflow.jev.claimHint',
      'For example: this tool call completed successfully.'
    ),
    prepare: translate('forflow.jev.prepare', 'Prepare send preview'),
    preview: translate('forflow.jev.preview', 'Exact request preview · expires after 10 minutes'),
    send: translate('forflow.jev.send', 'Send this preview to Jev'),
    cancel: translate('forflow.jev.cancel', 'Discard preview'),
    busy: translate('forflow.jev.busy', 'Processing…'),
    history: translate('forflow.jev.history', 'Recent calls for this version (up to 20)'),
    noCalls: translate('forflow.jev.noCalls', 'No Jev calls for this version.'),
    unavailable: translate(
      'forflow.jev.unavailable',
      'Jev audit is available in the local Forflow desktop client.'
    ),
    error: translate(
      'forflow.jev.error',
      'The operation did not complete. Refresh the review and try again.'
    ),
    accept: translate('forflow.jev.accept', 'Add to Issues'),
    accepted: translate('forflow.jev.accepted', 'Added to Issues'),
    calibration: translate(
      'forflow.jev.calibration',
      'Probabilities are model outputs, not calibrated audit accuracy. No visible issue does not confirm the review.'
    ),
    probabilities: translate('forflow.jev.probabilities', 'Model details and probabilities'),
    outcome: translate('forflow.jev.outcome', 'Visible exceptions'),
    evidence: translate('forflow.jev.evidence', 'Evidence sufficiency'),
    claimCheck: translate('forflow.jev.claimCheck', 'Claim support'),
    attention: translate('forflow.jev.attention', 'Needs review'),
    none: translate('forflow.jev.none', 'No issue visible in selected evidence'),
    unknown: translate('forflow.jev.unknown', 'Unable to determine'),
    sufficient: translate(
      'forflow.jev.sufficient',
      'Evidence sufficient for the selected question'
    ),
    missing: translate('forflow.jev.missing', 'More evidence needed'),
    supported: translate('forflow.jev.supported', 'Claim supported by selected evidence'),
    conflict: translate('forflow.jev.conflict', 'Claim conflicts with selected evidence'),
    completed: translate('forflow.jev.completed', 'Completed'),
    pending: translate('forflow.jev.pending', 'Awaiting response'),
    rejected: translate('forflow.jev.rejected', 'Request rejected'),
    uncertain: translate('forflow.jev.uncertain', 'Completion and usage unknown'),
    inputTokens: translate('forflow.jev.inputTokens', 'Input tokens'),
    outputTokens: translate('forflow.jev.outputTokens', 'Output tokens'),
    noBill: translate('forflow.jev.noBill', 'No settled cost available')
  }
}
