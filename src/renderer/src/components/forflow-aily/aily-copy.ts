import { translate } from '@/i18n/i18n'

export function ailyCopy() {
  return {
    title: translate('forflow.aily.title', 'Doubao Work Partner'),
    subtitle: translate('forflow.aily.subtitle', 'Continue your Feishu conversation here.'),
    connect: translate('forflow.aily.connect', 'Connect your work partner'),
    finding: translate('forflow.aily.finding', 'Finding your work partner…'),
    choose: translate('forflow.aily.choose', 'Choose your work partner'),
    empty: translate(
      'forflow.aily.empty',
      'Open your personal work partner in Feishu once, then refresh this list.'
    ),
    setup: translate('forflow.aily.setup', 'Install and sign in to Feishu CLI'),
    refresh: translate('forflow.aily.refresh', 'Refresh'),
    open: translate('forflow.aily.open', 'Open in Feishu'),
    change: translate('forflow.aily.change', 'Change work partner'),
    placeholder: translate(
      'forflow.aily.placeholder',
      'What would you like your work partner to do?'
    ),
    send: translate('forflow.aily.send', 'Send'),
    sending: translate('forflow.aily.sending', 'Sending…'),
    waiting: translate('forflow.aily.waiting', 'Sent · waiting for a reply'),
    sync: translate(
      'forflow.aily.sync',
      'Messages are sent with your Feishu account and sync to the same conversation.'
    ),
    earlier: translate('forflow.aily.earlier', 'Load earlier messages'),
    loading: translate('forflow.aily.loading', 'Loading conversation…'),
    noMessages: translate('forflow.aily.noMessages', 'Send a task to start the conversation.'),
    unavailable: translate(
      'forflow.aily.unavailable',
      'This connection is available in the Forflow One desktop app.'
    ),
    partial: translate(
      'forflow.aily.partial',
      'More conversations are available. Open your work partner in Feishu, then refresh.'
    ),
    keyboard: translate('forflow.aily.keyboard', 'Enter to send · Shift+Enter for a new line'),
    failed: translate(
      'forflow.aily.failed',
      'Could not sync with Feishu. Try refreshing the conversation.'
    )
  }
}
