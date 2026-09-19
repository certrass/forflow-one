import { translateMain } from '../i18n/main-i18n'
import { dialog, type BrowserWindow, type MessageBoxOptions } from 'electron'

export type GpuFallbackRestartDecision = 'restart' | 'continue'

function getGpuDialogOptions(): MessageBoxOptions {
  return {
    type: 'warning',
    buttons: [
      translateMain('forflow.nativeCopy.95c668e7ce', 'Restart in Safe Graphics Mode'),
      translateMain('forflow.nativeCopy.c8e6e5971f', 'Keep Running')
    ],
    defaultId: 0,
    cancelId: 1,
    title: translateMain('forflow.nativeCopy.0c1f1b2fe8', 'Restart Orca in Safe Graphics Mode?'),
    message: translateMain(
      'forflow.nativeCopy.63ab9215b6',
      "Orca's graphics process has crashed repeatedly."
    ),
    detail: translateMain(
      'forflow.nativeCopy.5da9eedd42',
      'Safe graphics mode disables hardware acceleration and WebGL for this Orca version. Terminals and 3D content may render more slowly. Keep Running leaves graphics settings unchanged.'
    )
  }
}

export async function promptForGpuFallbackRestart(
  parentWindow?: BrowserWindow
): Promise<GpuFallbackRestartDecision> {
  const { response } = parentWindow
    ? await dialog.showMessageBox(parentWindow, getGpuDialogOptions())
    : await dialog.showMessageBox(getGpuDialogOptions())
  return response === 0 ? 'restart' : 'continue'
}
