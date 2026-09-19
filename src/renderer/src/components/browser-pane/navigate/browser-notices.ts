import type {
  BrowserDownloadFinishedEvent,
  BrowserPermissionDeniedEvent,
  BrowserPopupEvent
} from '../../../../../shared/browser-guest-events'
import type { BrowserLoadError } from '../../../../../shared/browser-workspace-types'
import { isChromiumCertificateErrorCode } from '../../../../../shared/browser-certificate-errors'
import { translate } from '@/i18n/i18n'
import { BROWSER_GUEST_RECOVERY_ERROR_CODE } from '../host-guest/browser-page-guest-recovery'

export type LoadFailureMeta = {
  host: string | null
  isLocalhostLike: boolean
}

type BrowserLoadErrorLike = BrowserLoadError | null

// Unknown Chromium permissions keep their raw name instead of disappearing behind invented copy.
function humanizePermission(permission: string): string {
  switch (permission) {
    case 'notifications':
      return translate('forflow.finalCopy.8bb6922758', 'notifications')
    case 'fullscreen':
      return translate('forflow.finalCopy.b58ae57ccd', 'fullscreen')
    case 'clipboard-read':
      return translate('forflow.finalCopy.1609d3bcd9', 'clipboard access')
    case 'media':
      return translate('forflow.desktopCopy.92a1b612c3', 'camera or microphone access')
    case 'pointerLock':
      return translate('forflow.desktopCopy.ef52b4ef7f', 'pointer lock')
    case 'storage-access':
      return translate(
        'forflow.desktopCopy.4237dc4fc5',
        'access to its own cookies and storage while embedded on this page'
      )
    case 'top-level-storage-access':
      return translate(
        'forflow.desktopCopy.2fa5086caa',
        'cookie access on behalf of an embedded site'
      )
    case 'geolocation':
      return translate('forflow.finalCopy.61d03e1356', 'your location')
    case 'idle-detection':
      return translate('forflow.desktopCopy.8e748337bd', 'permission to detect when you are idle')
    case 'display-capture':
      return translate('forflow.desktopCopy.63fdababc8', 'permission to capture your screen')
    case 'window-management':
      return translate(
        'forflow.desktopCopy.de81baf580',
        'screen information and multi-screen window placement'
      )
    case 'keyboardLock':
      return translate('forflow.desktopCopy.d0fc9b2c66', 'permission to capture keyboard input')
    case 'openExternal':
      return translate('forflow.desktopCopy.f9e654afa6', 'permission to open a link outside Orca')
    case 'fileSystem':
      return translate('forflow.desktopCopy.fe7faed70a', 'access to your files or folders')
    case 'hid':
      return translate(
        'forflow.desktopCopy.b175ce34b5',
        'access to a connected human interface device'
      )
    case 'usb':
      return translate('forflow.desktopCopy.dec481fb26', 'access to a USB device')
    case 'serial':
      return translate('forflow.desktopCopy.06c4e371db', 'access to a serial device')
    case 'midi':
      return translate('forflow.desktopCopy.37dac4ab41', 'access to your MIDI devices')
    case 'midiSysex':
      return translate('forflow.desktopCopy.480994b791', 'access to system-exclusive MIDI messages')
    case 'mediaKeySystem':
      return translate('forflow.desktopCopy.a4293605e3', 'access to protected media playback')
    case 'speaker-selection':
      return translate(
        'forflow.desktopCopy.f226301b04',
        'permission to choose an audio output device'
      )
    default:
      return permission
  }
}

export function formatPermissionNotice(event: BrowserPermissionDeniedEvent): string {
  const target =
    event.origin === 'unknown'
      ? translate('forflow.finalCopy.270e420dd3', 'this page')
      : event.origin
  return translate(
    'forflow.dynamicCopy.f4010d7ba0',
    '{{value0}} asked for {{value1}}, and Orca denied it.',
    { value0: target, value1: humanizePermission(event.permission) }
  )
}

export function formatPopupNotice(event: BrowserPopupEvent): string | null {
  const target =
    event.origin === 'unknown' ? translate('forflow.finalCopy.1057608d0a', 'A site') : event.origin
  if (event.action === 'opened-in-orca') {
    return null
  }
  if (event.action === 'opened-external') {
    return translate(
      'forflow.dynamicCopy.657aee5b04',
      '{{value0}} opened a new window in your default browser.',
      { value0: target }
    )
  }
  return translate(
    'forflow.dynamicCopy.2cbc4cc492',
    '{{value0}} tried to open a popup Orca does not support here.',
    { value0: target }
  )
}

export function formatDownloadFinishedNotice(event: BrowserDownloadFinishedEvent): string {
  if (event.status === 'completed') {
    return event.savePath
      ? translate('forflow.finalCopy.f99482b9fd', 'Downloaded to {{path}}.', {
          path: event.savePath
        })
      : translate('forflow.finalCopy.581ccff7f4', 'Download complete.')
  }
  if (event.status === 'failed') {
    return event.error ?? translate('forflow.finalCopy.22edbe1fbf', 'Download failed.')
  }
  return event.error ?? translate('forflow.finalCopy.ec9841a530', 'Download canceled.')
}

export function formatByteCount(bytes: number | null): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) {
    return null
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

export function formatLoadFailureDescription(
  loadError: BrowserLoadErrorLike,
  meta: LoadFailureMeta
): string {
  if (!loadError) {
    return translate('forflow.desktopCopy.15460c0056', 'The page did not respond.')
  }
  if (loadError.code === BROWSER_GUEST_RECOVERY_ERROR_CODE) {
    return loadError.description
  }
  if (isChromiumCertificateErrorCode(loadError.code)) {
    const host = meta.host ?? translate('forflow.finalCopy.2e865ae15c', 'this address')
    if (loadError.code === -200) {
      return translate(
        'browser.loadFailure.certificateNameMismatch',
        "The certificate doesn't match {{value0}}.",
        { value0: host }
      )
    }
    if (loadError.code === -201) {
      return translate(
        'browser.loadFailure.certificateDateInvalid',
        "The certificate for {{value0}} isn't valid at the current date and time.",
        { value0: host }
      )
    }
    if (loadError.code === -202) {
      return translate(
        'browser.loadFailure.certificateAuthorityInvalid',
        "Orca doesn't trust the authority that issued the certificate for {{value0}}.",
        { value0: host }
      )
    }
    return translate(
      'browser.loadFailure.certificateVerificationFailed',
      "Orca couldn't verify the certificate for {{value0}}.",
      { value0: host }
    )
  }
  if (meta.isLocalhostLike) {
    return translate('forflow.desktopCopy.b3217a6cbb', "We couldn't connect to your local server.")
  }
  if (loadError.code === 0) {
    return loadError.description
  }
  return translate('forflow.desktopCopy.8488141db0', "We couldn't connect to this page.")
}

export function formatLoadFailureRecoveryHint(
  meta: LoadFailureMeta,
  loadError?: BrowserLoadErrorLike
): string | null {
  if (
    !meta.isLocalhostLike ||
    loadError?.code === BROWSER_GUEST_RECOVERY_ERROR_CODE ||
    (loadError && isChromiumCertificateErrorCode(loadError.code))
  ) {
    return null
  }
  return translate(
    'forflow.desktopCopy.b317967a19',
    'If this should be a local app, make sure the server is running and listening on the expected port.'
  )
}

export function isCertificateLoadError(loadError: BrowserLoadErrorLike): boolean {
  return Boolean(loadError && isChromiumCertificateErrorCode(loadError.code))
}
