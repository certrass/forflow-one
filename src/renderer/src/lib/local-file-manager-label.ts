import { translate } from '@/i18n/i18n'
type LocalFileManager = 'finder' | 'file-explorer' | 'file-manager'

export function getLocalFileManager(userAgent?: string): LocalFileManager {
  const resolvedUserAgent =
    userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent)
  if (resolvedUserAgent.includes('Mac')) {
    return 'finder'
  }
  if (resolvedUserAgent.includes('Windows')) {
    return 'file-explorer'
  }
  return 'file-manager'
}

/** The file manager's name, for lists of apps a path can be opened in. */
export function getLocalFileManagerLabel(userAgent?: string): string {
  switch (getLocalFileManager(userAgent)) {
    case 'finder':
      return 'Finder'
    case 'file-explorer':
      return translate('forflow.desktopCopy.d6f6a04891', 'File Explorer')
    case 'file-manager':
      return translate('forflow.desktopCopy.4a81e64643', 'File Manager')
  }
}
