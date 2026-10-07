import { BrowserWindow } from 'electron'

export function reloadFocusedMenuWindow(
  ignoreCache: boolean,
  onBeforeReload?: (options: { ignoreCache: boolean; webContentsId: number }) => void
): void {
  const webContents = BrowserWindow.getFocusedWindow()?.webContents
  if (!webContents) {
    return
  }
  onBeforeReload?.({ ignoreCache, webContentsId: webContents.id })
  if (ignoreCache) {
    webContents.reloadIgnoringCache()
    return
  }
  webContents.reload()
}
