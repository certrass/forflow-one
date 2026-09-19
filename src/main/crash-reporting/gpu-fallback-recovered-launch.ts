import { translateMain } from '../i18n/main-i18n'
import { dialog, type BrowserWindow, type MessageBoxOptions } from 'electron'

export type GpuFallbackRecoveredLaunchDecision = 'keep-safe' | 'retry-hardware'

function getGpuDialogOptions(): MessageBoxOptions {
  return {
    type: 'info',
    buttons: [
      translateMain('forflow.nativeCopy.a414eebdbc', 'Keep Safe Graphics Mode'),
      translateMain('forflow.nativeCopy.a402674695', 'Try Hardware Acceleration')
    ],
    defaultId: 0,
    cancelId: 0,
    title: translateMain('forflow.nativeCopy.a3e4be17b2', 'Safe Graphics Mode is Active'),
    message: translateMain(
      'forflow.nativeCopy.21d599d244',
      'Orca recovered in Safe Graphics Mode.'
    ),
    detail: translateMain(
      'forflow.nativeCopy.a9c5be403f',
      'Safe Graphics Mode was enabled after repeated graphics crashes. Keep it for stability, or restart and try hardware acceleration again.'
    )
  }
}

export async function promptForGpuFallbackRecoveredLaunch(
  parentWindow?: BrowserWindow
): Promise<GpuFallbackRecoveredLaunchDecision> {
  const { response } = parentWindow
    ? await dialog.showMessageBox(parentWindow, getGpuDialogOptions())
    : await dialog.showMessageBox(getGpuDialogOptions())
  return response === 1 ? 'retry-hardware' : 'keep-safe'
}

export type GpuFallbackRecoveredLaunchHandlers = {
  isQuitting: () => boolean
  prompt: () => Promise<GpuFallbackRecoveredLaunchDecision>
  confirmSafeGraphics: () => void
  clearSafeGraphics: () => void
  onPromptFailed: (error: unknown) => void
  onSafeGraphicsKept: () => void
  restartWithHardware: () => void
}

/** Resolves consent after an unanswered crash-time prompt recovered into safe graphics. */
export async function handleGpuFallbackRecoveredLaunch(
  handlers: GpuFallbackRecoveredLaunchHandlers
): Promise<void> {
  let decision: GpuFallbackRecoveredLaunchDecision
  try {
    decision = await handlers.prompt()
  } catch (error) {
    handlers.onPromptFailed(error)
    return
  }
  if (handlers.isQuitting()) {
    return
  }
  if (decision === 'retry-hardware') {
    handlers.clearSafeGraphics()
    handlers.restartWithHardware()
    return
  }
  handlers.confirmSafeGraphics()
  handlers.onSafeGraphicsKept()
}
