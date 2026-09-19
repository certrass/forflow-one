import { app, ipcMain } from 'electron'
import { homedir } from 'node:os'
import { assertForflowTransferSender } from './approval-broker'
import { isForflowPrivateDeployment } from './deployment-policy'
import { getBundledLauncherPath } from '../cli/bundled-cli-launcher-path'

export function registerForflowBundledSkillHandlers(): void {
  ipcMain.handle('forflow:skills:installBundled', async (event, names: unknown) => {
    assertForflowTransferSender(event)
    if (!isForflowPrivateDeployment()) {
      throw new Error('仅适用于 Forflow One 私有版。')
    }
    const launcherPath = getBundledLauncherPath(process.platform, process.resourcesPath)
    if (!launcherPath) {
      throw new Error('当前平台尚无配套命令行程序。')
    }
    const { installForflowBundledSkills } = await import('./bundled-skill-install')
    return installForflowBundledSkills({
      names,
      homeDirectory: homedir(),
      stateDirectory: app.getPath('userData'),
      version: app.getVersion(),
      launcherPath
    })
  })
}
