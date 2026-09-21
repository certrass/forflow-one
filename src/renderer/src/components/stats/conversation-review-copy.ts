import { translate } from '@/i18n/i18n'
import type { CodexAuditRow } from '../../../../shared/codex-usage-audit-types'

export function conversationReviewCopy() {
  return {
    user: translate('forflow.conversationReview.user', 'User original'),
    assistant: translate('forflow.conversationReview.assistant', 'Assistant original'),
    context: translate('forflow.conversationReview.context', 'Context'),
    summary: translate('forflow.conversationReview.summary', 'Compaction summary'),
    recordType: translate('forflow.conversationReview.recordType', 'Record type'),
    userMessages: translate('forflow.conversationReview.userMessages', 'User message records'),
    assistantMessages: translate(
      'forflow.conversationReview.assistantMessages',
      'Assistant message records'
    ),
    omittedRows: translate(
      'forflow.conversationReview.omittedRows',
      'Records outside the display limit'
    ),
    incompleteLines: translate(
      'forflow.conversationReview.incompleteLines',
      'Incomplete source lines'
    ),
    unreadSources: translate('forflow.conversationReview.unreadSources', 'Unread sources'),
    fileLimit: translate('forflow.conversationReview.fileLimit', 'Outside the file limit'),
    readFailed: translate('forflow.conversationReview.readFailed', 'Unable to read'),
    textChars: translate('forflow.conversationReview.textChars', 'Text characters'),
    unsupportedBlocks: translate(
      'forflow.conversationReview.unsupportedBlocks',
      'Content blocks not included as text'
    ),
    noText: translate(
      'forflow.conversationReview.noText',
      'No text body was read from this record.'
    ),
    summaryNote: translate(
      'forflow.conversationReview.summaryNote',
      'A summary does not replace the original messages.'
    ),
    coverageNote: translate(
      'forflow.conversationReview.coverageNote',
      'Message counts cover the source fragments read. Image and other non-text blocks are not included as message text. Unknown means the source snapshot did not record this field.'
    )
  }
}

export function conversationRecordLabel(
  row: CodexAuditRow,
  copy: ReturnType<typeof conversationReviewCopy>
): string | null {
  if (row.recordFormat === 'compaction') {
    return copy.summary
  }
  if (row.recordFormat === 'turn_context') {
    return copy.context
  }
  if (row.recordFormat === 'response_message') {
    return row.messageRole === 'user'
      ? copy.user
      : row.messageRole === 'assistant'
        ? copy.assistant
        : null
  }
  return null
}
