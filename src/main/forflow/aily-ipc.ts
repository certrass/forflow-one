import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { ailyChatIdSchema, ailySendSchema } from '../../shared/forflow-aily'
import { isTrustedUIRenderer } from '../ipc/ui'
import { isForflowPrivateDeployment } from './deployment-policy'
import { AilyClient } from './aily-client'

export function registerForflowAilyHandlers(): void {
  let client: AilyClient | undefined
  const service = (event: IpcMainInvokeEvent): AilyClient => {
    if (
      !isForflowPrivateDeployment() ||
      event.senderFrame !== event.sender.mainFrame ||
      !isTrustedUIRenderer(event.sender)
    ) {
      throw new Error('此调用不属于 Forflow 桌面主界面。')
    }
    client ??= new AilyClient(app.getPath('userData'))
    return client
  }
  ipcMain.handle('forflow:aily:status', (event) => service(event).status())
  ipcMain.handle('forflow:aily:discover', (event) => service(event).discover())
  ipcMain.handle('forflow:aily:connect', (event, chatId: unknown) =>
    service(event).connect(ailyChatIdSchema.parse(chatId))
  )
  ipcMain.handle('forflow:aily:disconnect', (event) => service(event).disconnect())
  ipcMain.handle('forflow:aily:messages', (event, token: unknown) =>
    service(event).messages(z.string().max(4096).optional().parse(token))
  )
  ipcMain.handle('forflow:aily:send', (event, input: unknown) =>
    service(event).send(ailySendSchema.parse(input))
  )
}
