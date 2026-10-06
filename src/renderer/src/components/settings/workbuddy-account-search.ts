import { translate } from '@/i18n/i18n'
import type { SettingsSearchEntry } from './settings-search'

export function getWorkBuddyAccountSearchEntries(): SettingsSearchEntry[] {
  return [
    {
      title: 'WorkBuddy',
      description: translate(
        'forflow.workbuddyAccount.description',
        'Use the account signed in to WorkBuddy on this device.'
      ),
      keywords: ['WorkBuddy', '账户', '账号', '登录', 'account', 'login']
    }
  ]
}
