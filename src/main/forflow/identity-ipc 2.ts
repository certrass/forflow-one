import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { isForflowPrivateDeployment } from './deployment-policy'
import { ForflowIdentityClient } from './identity-client'
import { ForflowIdentityStorage } from './identity-storage'
import { isTrustedUIRenderer } from '../ipc/ui'
import {
  forflowCredentialsSchema,
  forflowCreateUserSchema,
  forflowResetPasswordSchema,
  forflowUserStateSchema
} from '../../shared/forflow-identity'

export function registerForflowIdentityHandlers(): void {
  let client: ForflowIdentityClient | undefined
  const service = (event: IpcMainInvokeEvent): ForflowIdentityClient => {
    if (
      !isForflowPrivateDeployment() ||
      event.senderFrame !== event.sender.mainFrame ||
      !isTrustedUIRenderer(event.sender)
    ) {
      throw new Error('此调用不属于 Forflow 桌面主界面。')
    }
    client ??= new ForflowIdentityClient(new ForflowIdentityStorage(app.getPath('userData')))
    return client
  }
  ipcMain.handle('forflow:identity:status', (event) => service(event).status())
  ipcMain.handle('forflow:identity:configure', (event, value: unknown) =>
    service(event).configure(z.string().max(2048).nullable().parse(value))
  )
  ipcMain.handle('forflow:identity:login', (event, value: unknown) =>
    service(event).login(forflowCredentialsSchema.parse(value))
  )
  ipcMain.handle('forflow:identity:logout', (event) => service(event).logout())
  ipcMain.handle('forflow:identity:users', (event) => service(event).users())
  ipcMain.handle('forflow:identity:createUser', (event, value: unknown) =>
    service(event).createUser(forflowCreateUserSchema.parse(value))
  )
  ipcMain.handle('forflow:identity:setUserDisabled', (event, value: unknown) =>
    service(event).setUserDisabled(forflowUserStateSchema.parse(value))
  )
  ipcMain.handle('forflow:identity:resetPassword', (event, value: unknown) =>
    service(event).resetPassword(forflowResetPasswordSchema.parse(value))
  )
  ipcMain.handle('forflow:identity:audit', (event) => service(event).audit())
}
