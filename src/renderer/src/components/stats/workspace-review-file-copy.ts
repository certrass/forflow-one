import { translate } from '@/i18n/i18n'

export function workspaceReviewFileCopy() {
  return {
    chooseProject: translate(
      'forflow.workspaceFiles.chooseProject',
      'Choose a project first to browse its files.'
    ),
    browseNote: translate(
      'forflow.workspaceFiles.browseNote',
      'Browse folders and select the files you want reviewed. Browsing lists file names only.'
    ),
    root: translate('forflow.workspaceFiles.root', 'Project root'),
    parent: translate('forflow.workspaceFiles.parent', 'Up one folder'),
    openFolder: translate('forflow.workspaceFiles.openFolder', 'Open folder'),
    currentFolder: translate('forflow.workspaceFiles.currentFolder', 'Current folder'),
    search: translate('forflow.workspaceFiles.search', 'Filter files in this folder'),
    loading: translate('forflow.workspaceFiles.loading', 'Listing files…'),
    empty: translate(
      'forflow.workspaceFiles.empty',
      'This folder has no selectable files or folders.'
    ),
    noMatches: translate(
      'forflow.workspaceFiles.noMatches',
      'No names match in this folder. Clear the filter or open another folder.'
    ),
    truncated: translate(
      'forflow.workspaceFiles.truncated',
      'Only the first 500 entries are listed. The filter searches this list, not the whole project.'
    ),
    error: translate(
      'forflow.workspaceFiles.error',
      'Could not list this folder. Check access or try again.'
    ),
    unavailable: translate(
      'forflow.workspaceFiles.unavailable',
      'File browsing is unavailable in this runtime.'
    ),
    unsupported: translate(
      'forflow.workspaceFiles.unsupported',
      'This project cannot be browsed on this device.'
    ),
    retry: translate('forflow.workspaceFiles.retry', 'Try again'),
    selected: translate('forflow.workspaceFiles.selected', 'Selected materials'),
    noSelection: translate(
      'forflow.workspaceFiles.noSelection',
      'Select at least one file from the project list.'
    ),
    limit: translate(
      'forflow.workspaceFiles.limit',
      '40 files selected. Remove a file before selecting another.'
    ),
    purpose: translate('forflow.workspaceFiles.purpose', 'File purpose'),
    purposeNote: translate(
      'forflow.workspaceFiles.purposeNote',
      'Adjust the suggested purpose to match how each file is used.'
    ),
    code: translate('forflow.workspaceFiles.code', 'Code'),
    document: translate('forflow.workspaceFiles.document', 'Requirements and documents'),
    verification: translate('forflow.workspaceFiles.verification', 'Test or build records'),
    remove: translate('forflow.workspaceFiles.remove', 'Remove')
  }
}
