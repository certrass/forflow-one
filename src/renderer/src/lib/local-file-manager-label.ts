import { translate } from '@/i18n/i18n'
export function getLocalFileManagerLabel(userAgent?: string): string {
  const resolvedUserAgent =
    userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent)
  if (resolvedUserAgent.includes('Mac')) {
    return 'Finder'
  }
  if (resolvedUserAgent.includes('Windows')) {
    return translate('forflow.desktopCopy.d6f6a04891', 'File Explorer')
  }
  return translate('forflow.desktopCopy.4a81e64643', 'File Manager')
}
