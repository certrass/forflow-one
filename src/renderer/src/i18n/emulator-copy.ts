import type { Tab } from '../../../shared/tab-types'
import { translate } from './i18n'
export function defaultEmulatorTitle(): string {
  return translate('forflow.desktopCopy.2644924b6a', 'Mobile Emulator')
}

export function simulatorPaletteTabTitle(tab: Tab): string {
  return tab.label || defaultEmulatorTitle()
}
