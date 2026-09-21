import type { CodexUsageRange, CodexUsageScope } from '../../../../shared/codex-usage-types'
import { translate } from '@/i18n/i18n'

export const RANGE_OPTIONS: CodexUsageRange[] = ['7d', '30d', '90d', 'all']
export const SCOPE_OPTIONS: { value: CodexUsageScope; label: string }[] = [
  {
    value: 'orca',
    get label() {
      return translate('auto.components.stats.CodexUsagePane.201766b754', 'Orca worktrees only')
    }
  },
  {
    value: 'all',
    get label() {
      return translate('auto.components.stats.CodexUsagePane.4fe8820098', 'All local Codex usage')
    }
  }
]
export const RANGE_LABELS: Record<CodexUsageRange, string> = {
  get '7d'() {
    return translate('auto.components.stats.CodexUsagePane.rangeLast7Days', 'Last 7 days')
  },
  get '30d'() {
    return translate('auto.components.stats.CodexUsagePane.rangeLast30Days', 'Last 30 days')
  },
  get '90d'() {
    return translate('auto.components.stats.CodexUsagePane.rangeLast90Days', 'Last 90 days')
  },
  get all() {
    return translate('auto.components.stats.CodexUsagePane.rangeAllTime', 'All time')
  }
}
