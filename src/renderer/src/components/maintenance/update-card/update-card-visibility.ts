import { translate } from '@/i18n/i18n'
import type { UpdateStatus } from '../../../../../shared/update-status-types'

export function isUpdateCardVisible({
  status,
  dismissedVersion,
  cachedVersion,
  updateUserInitiatedCycle,
  autoDismissed = false,
  collapsed = false
}: {
  status: UpdateStatus
  dismissedVersion: string | null
  cachedVersion: string | null
  updateUserInitiatedCycle: boolean
  autoDismissed?: boolean
  collapsed?: boolean
}): boolean {
  const isUserInitiated = 'userInitiated' in status && Boolean(status.userInitiated)

  if (status.state === 'checking' && !isUserInitiated) {
    return false
  }
  if (status.state === 'not-available' && (!isUserInitiated || autoDismissed)) {
    return false
  }
  if (status.state === 'idle') {
    return false
  }
  if (cachedVersion && dismissedVersion === cachedVersion && !updateUserInitiatedCycle) {
    if (status.state !== 'downloading' && status.state !== 'error') {
      return false
    }
  }
  return !(
    collapsed &&
    (status.state === 'downloading' || status.state === 'downloaded' || status.state === 'error')
  )
}

export function getUpdateCardAriaLabel(status: UpdateStatus): string {
  switch (status.state) {
    case 'idle':
      return translate('forflow.desktopCopy.1e6bf669df', 'Update status')
    case 'checking':
      return translate('forflow.desktopCopy.53b276ad79', 'Checking for updates')
    case 'not-available':
      return translate('forflow.desktopCopy.6232df515e', "You're on the latest version")
    case 'available':
      return translate('forflow.desktopCopy.ff8b555d81', 'Update available')
    case 'downloading':
      return translate('forflow.desktopCopy.0143682386', 'Downloading update')
    case 'downloaded':
      return translate('forflow.desktopCopy.b4ecd41920', 'Update ready to install')
    case 'error':
      return translate('forflow.desktopCopy.c00e76f05d', 'Update error')
  }
}

export function isHttp2ProtocolError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('err_http2_protocol_error') ||
    normalized.includes('http2_protocol_error') ||
    (normalized.includes('http/2') && normalized.includes('protocol'))
  )
}
