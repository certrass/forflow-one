import { translate } from '@/i18n/i18n'
import type { ProjectHostSetup } from '../../../shared/project-types'

export function getPendingSetupDetail(setup: ProjectHostSetup): string {
  switch (setup.setupState) {
    case 'not-set-up':
      return translate(
        'forflow.desktopCopy.9c40dd9bfb',
        'Project tracked on this host but not set up'
      )
    case 'setting-up':
      return translate('forflow.desktopCopy.4919551845', 'Project setup is in progress')
    case 'error':
      return translate('forflow.desktopCopy.7e9727e4aa', 'Project setup needs attention')
    case 'unsupported':
      return translate('forflow.desktopCopy.e379e914c5', 'Project is unsupported on this host')
    case 'ready':
      return setup.path
  }
}
