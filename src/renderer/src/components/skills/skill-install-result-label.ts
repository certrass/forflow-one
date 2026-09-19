import { translate } from '@/i18n/i18n'
import type { SkillInstallResult } from '../../../../shared/skill-install-contract'

export function skillInstallResultLabel(result: SkillInstallResult): string {
  switch (result.status) {
    case 'installed':
      return translate('forflow.desktopCopy.76f7e97ecf', 'Installed and verified.')
    case 'updated':
      return translate('forflow.desktopCopy.deb69aaef5', 'Updated and verified.')
    case 'unchanged':
      return translate('forflow.desktopCopy.092f409cd2', 'This exact version is already installed.')
    case 'partial':
      return translate(
        'forflow.desktopCopy.c80625a5c6',
        'Installed, but one or more agent placements need attention.'
      )
    case 'removed':
      return 'Removed.'
    case 'cancelled':
      return translate('forflow.desktopCopy.8617e01164', 'Installation cancelled.')
    case 'conflict':
    case 'failed':
      return translate('forflow.desktopCopy.0b9d83696c', 'Installation did not complete.')
  }
}
