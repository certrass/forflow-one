import { translate } from '@/i18n/i18n'

export function getCompanionCatalog() {
  return [
    {
      id: 'aily' as const,
      label: translate('forflow.aily.title', 'Doubao work partner'),
      cmd: 'forflow aily',
      searchAliases: ['豆包', '飞书', 'aily', 'lark-cli'],
      homepageUrl: 'https://www.feishu.cn/product/aily'
    },
    {
      id: 'workbuddy' as const,
      label: 'WorkBuddy',
      cmd: 'forflow workbuddy',
      searchAliases: ['腾讯', '工作伙伴'],
      homepageUrl: 'https://www.codebuddy.cn/work/'
    }
  ]
}
