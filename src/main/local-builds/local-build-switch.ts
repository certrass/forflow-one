import { translateMain } from '../i18n/main-i18n'
import { app, dialog, type BrowserWindow } from 'electron'
import { SCHEMA_VERSION } from '../../shared/constants'
import { compareAppVersions } from '../../shared/app-version'
import { assertLocalBuildCompatibility } from './local-build-compatibility'
import { loadLocalBuildCandidate, type LocalBuildCandidate } from './local-build-candidate'

export async function chooseLocalBuild(
  window: BrowserWindow | null
): Promise<LocalBuildCandidate | null> {
  const openDialogOptions: Electron.OpenDialogOptions = {
    title: translateMain('forflow.nativeCopy.a3a7de2710', 'Choose a Local Orca Build'),
    buttonLabel: translateMain('forflow.nativeCopy.a33a966000', 'Choose Build'),
    properties: ['openFile'],
    filters: [
      {
        name: translateMain('forflow.nativeCopy.0ddb8877d3', 'Orca update manifest'),
        extensions: ['yml']
      }
    ]
  }
  const selection = await (window
    ? dialog.showOpenDialog(window, openDialogOptions)
    : dialog.showOpenDialog(openDialogOptions))
  const manifestPath = selection.filePaths[0]
  if (selection.canceled || !manifestPath) {
    return null
  }
  const candidate = await loadLocalBuildCandidate(manifestPath, process.arch)
  try {
    if (compareAppVersions(candidate.version, app.getVersion()) === 0) {
      throw new Error(
        translateMain(
          'forflow.nativeCopy.12f73fb9bf',
          'This build has the same version as the running app. Run pn build:mac again to create a uniquely versioned build.'
        )
      )
    }
    const compatibility = await assertLocalBuildCompatibility(candidate.compatibility)
    const terminalSummary =
      compatibility.liveTerminalCount === 0
        ? translateMain('forflow.nativeCopy.62dd771e0d', 'No live terminals need to reconnect.')
        : translateMain(
            'forflow.finalCopy.590eb8108b',
            '{{count}} live terminals will reconnect after restart.',
            { count: compatibility.liveTerminalCount }
          )
    const messageBoxOptions: Electron.MessageBoxOptions = {
      type: 'question',
      title: translateMain('forflow.nativeCopy.2214c55485', 'Use Local Orca Build?'),
      message: `${app.getVersion()} → ${candidate.version}`,
      detail: translateMain(
        'forflow.finalCopy.9668ef7136',
        '{{terminals}}\nWorkspace cards and settings are compatible with state schema {{schema}}.\n\nThe build must have the same valid code signature as Orca or installation will stop.',
        { terminals: terminalSummary, schema: SCHEMA_VERSION }
      ),
      buttons: [
        translateMain('forflow.nativeCopy.90d351376e', 'Use Local Build'),
        translateMain('forflow.nativeCopy.19766ed6cc', 'Cancel')
      ],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    }
    const confirmation = await (window
      ? dialog.showMessageBox(window, messageBoxOptions)
      : dialog.showMessageBox(messageBoxOptions))
    if (confirmation.response === 0) {
      return candidate
    }
  } catch (error) {
    await candidate.close()
    throw error
  }
  await candidate.close()
  return null
}
