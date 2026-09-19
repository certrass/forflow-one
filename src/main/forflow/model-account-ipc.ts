import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import {
  forflowModelAccountInputSchema,
  forflowModelProviderSchema
} from '../../shared/forflow-model-accounts'
import { isTrustedUIRenderer } from '../ipc/ui'
import { isForflowPrivateDeployment } from './deployment-policy'
import { ForflowModelAccountClient } from './model-account-client'
import { ForflowModelAccountStorage } from './model-account-storage'

export function registerForflowModelAccountHandlers(): void {
  let client: ForflowModelAccountClient | undefined
  const service = (event: IpcMainInvokeEvent): ForflowModelAccountClient => {
    if (
      !isForflowPrivateDeployment() ||
      event.senderFrame !== event.sender.mainFrame ||
      !isTrustedUIRenderer(event.sender)
    ) {
      throw new Error('此调用不属于 Forflow 桌面主界面。')
    }
    client ??= new ForflowModelAccountClient(
      new ForflowModelAccountStorage(app.getPath('userData'))
    )
    return client
  }
  ipcMain.handle('forflow:modelAccounts:list', (event) => service(event).list())
  ipcMain.handle('forflow:modelAccounts:save', (event, value: unknown) => {
    const target = service(event)
    const parsed = forflowModelAccountInputSchema.safeParse(value)
    if (!parsed.success) {
      throw new Error('账户配置格式无效。')
    }
    return target.save(parsed.data)
  })
  for (const operation of ['remove', 'test'] as const) {
    ipcMain.handle(`forflow:modelAccounts:${operation}`, (event, value: unknown) => {
      const target = service(event)
      const parsed = forflowModelProviderSchema.safeParse(value)
      if (!parsed.success) {
        throw new Error('账户提供商无效。')
      }
      return target[operation](parsed.data)
    })
  }
}
