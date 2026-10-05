import type { ForflowContextBlockingReason } from '../../../../shared/forflow-context-packet'
import { translate } from '@/i18n/i18n'

export function forflowContextBlockingCopy(reason: ForflowContextBlockingReason): string {
  switch (reason) {
    case 'missing_scope':
      return translate(
        'forflow.contextBeta.missingScope',
        'Session identity is not ready. Reopen the conversation before retrying.'
      )
    case 'no_user_text':
      return translate(
        'forflow.contextBeta.noUserText',
        'No persisted user text is available to hand off.'
      )
    case 'user_context_omitted':
      return translate(
        'forflow.contextBeta.userOmitted',
        'Some user text is missing or exceeds the budget. Narrow the task without dropping its constraints.'
      )
    case 'history_incomplete':
      return translate(
        'forflow.contextBeta.historyIncomplete',
        'Earlier history is missing or still loading. Load earlier messages, then refresh.'
      )
    case 'ambiguous_source':
      return translate(
        'forflow.contextBeta.ambiguousSource',
        'Source message IDs are missing or duplicated. Reload the conversation before retrying.'
      )
    case 'source_truncated':
      return translate(
        'forflow.contextBeta.sourceTruncated',
        'The source contains clipped records. Recover the complete original before preparing a handoff.'
      )
    case 'source_unavailable':
      return translate(
        'forflow.contextBeta.sourceUnavailable',
        'The latest source read failed. Check the connection and reload; visible history may be stale.'
      )
    case 'delivery_pending':
      return translate(
        'forflow.contextBeta.deliveryPending',
        'A message is awaiting confirmation or retry. Resolve its delivery before preparing a handoff.'
      )
    case 'budget_exceeded':
      return translate(
        'forflow.contextBeta.budgetExceeded',
        'The handoff metadata exceeds the byte budget. Use a narrower task scope.'
      )
  }
}
