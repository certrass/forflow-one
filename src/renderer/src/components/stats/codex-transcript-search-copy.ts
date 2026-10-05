import { translate } from '@/i18n/i18n'

export function codexTranscriptSearchCopy() {
  return {
    title: translate('forflow.transcriptSearch.title', 'Search session content'),
    description: translate(
      'forflow.transcriptSearch.description',
      'Search indexed Codex conversations and tool output on this computer, across all history. Chart filters do not apply here.'
    ),
    placeholder: translate(
      'forflow.transcriptSearch.placeholder',
      'Search words from a conversation'
    ),
    empty: translate('forflow.transcriptSearch.empty', 'Enter text to find a session.'),
    sourceNote: translate(
      'forflow.transcriptSearch.sourceNote',
      'Open Review reads current logs and shows its source coverage. A search excerpt may be outside those records.'
    ),
    unavailable: translate(
      'forflow.transcriptSearch.unavailable',
      'Review requires an available local Codex log.'
    )
  }
}
