import { translate } from '@/i18n/i18n'
import type { SettingsSearchEntry } from './settings-search'

export function getForflowModelAccountSearchEntries(): SettingsSearchEntry[] {
  return [
    {
      title: translate('forflow.modelAccounts.title', '国内模型 API 账户'),
      description: translate(
        'forflow.modelAccounts.description',
        '配置 Kimi、智谱 GLM 与 DeepSeek 的官方 API。网页会员、Kimi Code 和 Coding Plan 的登录及额度另行配置。'
      ),
      keywords: [
        'Kimi',
        'Moonshot',
        '月之暗面',
        '智谱',
        'GLM',
        'DeepSeek',
        '深度求索',
        'API',
        '账户',
        '密钥'
      ]
    }
  ]
}
