import type { ForflowContextBlockingReason } from '../../../../shared/forflow-context-packet'
import { translate } from '@/i18n/i18n'

export function forflowContextBlockingCopy(reason: ForflowContextBlockingReason): string {
  switch (reason) {
    case 'missing_scope':
      return translate(
        'forflow.contextBeta.missingScope',
        'Reopen the conversation to copy its content.'
      )
    case 'no_user_text':
      return translate(
        'forflow.contextBeta.noUserText',
        'Send a message to start a conversation you can copy.'
      )
    case 'user_context_omitted':
      return translate(
        'forflow.contextBeta.userOmitted',
        'Some text is missing or too long. Load earlier messages or select the passages you need in the conversation.'
      )
    case 'history_incomplete':
      return translate(
        'forflow.contextBeta.historyIncomplete',
        'Load earlier messages, then refresh the content.'
      )
    case 'ambiguous_source':
      return translate(
        'forflow.contextBeta.ambiguousSource',
        'Reload the conversation to restore its message records.'
      )
    case 'source_truncated':
      return translate(
        'forflow.contextBeta.sourceTruncated',
        'Some records are clipped. Restore the complete text and try again.'
      )
    case 'source_unavailable':
      return translate(
        'forflow.contextBeta.sourceUnavailable',
        'Could not read the conversation. Check the connection and reload.'
      )
    case 'delivery_pending':
      return translate(
        'forflow.contextBeta.deliveryPending',
        'Send or retry the pending messages in this conversation first.'
      )
    case 'budget_exceeded':
      return translate(
        'forflow.contextBeta.budgetExceeded',
        'This conversation exceeds the copy limit. Select the passages you need in the conversation.'
      )
  }
}
