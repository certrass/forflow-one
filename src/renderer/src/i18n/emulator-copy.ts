import type { Tab } from '../../../shared/tab-types'
import { translate } from './i18n'

export function emulatorStartingLabel(): string {
  return translate('forflow.emulator.starting', 'Starting…')
}

export function noEmulatorDevicesMessage(): string {
  return translate(
    'forflow.emulator.noDevices',
    'No emulator devices found. Add an iOS Simulator in Xcode, or an Android Virtual Device in Android Studio.'
  )
}
export function defaultEmulatorTitle(): string {
  return translate('forflow.desktopCopy.2644924b6a', 'Mobile Emulator')
}

export function simulatorPaletteTabTitle(tab: Tab): string {
  return tab.label || defaultEmulatorTitle()
}
