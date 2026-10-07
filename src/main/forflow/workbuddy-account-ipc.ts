import { ipcMain } from 'electron'
import type { GlobalSettings } from '../../shared/global-settings-types'
import type { WorkBuddyAccountStatus } from '../../shared/forflow-workbuddy-account'
import { resolveLocalAccountRuntimeTarget } from '../../shared/local-account-runtime'
import { isTrustedUIRenderer } from '../ipc/ui'
import { isForflowPrivateDeployment } from './deployment-policy'
import { WorkBuddyAccountClient } from './workbuddy-account-client'

export function registerForflowWorkBuddyAccountHandlers(
  getSettings: () => GlobalSettings | null
): void {
  const client = new WorkBuddyAccountClient()
  const isLocalHost = (): boolean => {
    const settings = getSettings()
    return Boolean(
      settings &&
      !settings.activeRuntimeEnvironmentId?.trim() &&
      resolveLocalAccountRuntimeTarget(settings).runtime === 'host'
    )
  }
  ipcMain.handle(
    'forflow:workbuddyAccount:getStatus',
    async (event): Promise<WorkBuddyAccountStatus> => {
      if (
        !isForflowPrivateDeployment() ||
        event.senderFrame !== event.sender.mainFrame ||
        !isTrustedUIRenderer(event.sender)
      ) {
        throw new Error('此调用不属于 Forflow 桌面主界面。')
      }
      if (!isLocalHost()) {
        return { state: 'local-only' }
      }
      const result = await client.getStatus()
      return isLocalHost() ? result : { state: 'local-only' }
    }
  )
}
