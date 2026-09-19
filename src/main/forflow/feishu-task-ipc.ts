import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { isTrustedUIRenderer } from '../ipc/ui'
import { isForflowPrivateDeployment } from './deployment-policy'
import { FeishuTaskClient } from './feishu-task-client'
import { feishuProfileSchema, feishuQuerySchema, feishuIdSchema } from '../../shared/forflow-feishu'
import { z } from 'zod'

function validated<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new Error('飞书参数格式无效，请检查应用 ID 或重新选择任务。')
  }
  return result.data
}

export function registerForflowFeishuHandlers(): void {
  let client: FeishuTaskClient | undefined
  const service = (event: IpcMainInvokeEvent): FeishuTaskClient => {
    if (
      !isForflowPrivateDeployment() ||
      event.senderFrame !== event.sender.mainFrame ||
      !isTrustedUIRenderer(event.sender)
    ) {
      throw new Error('此调用不属于 Forflow 桌面主界面。')
    }
    client ??= new FeishuTaskClient(app.getPath('userData'))
    return client
  }
  ipcMain.handle('forflow:feishu:status', (event) => service(event).status())
  ipcMain.handle('forflow:feishu:connect', (event, input: unknown) =>
    service(event).connect(validated(feishuProfileSchema.optional(), input))
  )
  ipcMain.handle('forflow:feishu:disconnect', (event) => service(event).disconnect())
  ipcMain.handle('forflow:feishu:tasklists', (event, token: unknown) =>
    service(event).tasklists(validated(z.string().max(4096).optional(), token))
  )
  ipcMain.handle('forflow:feishu:tasks', (event, input: unknown) =>
    service(event).tasks(validated(feishuQuerySchema, input))
  )
  ipcMain.handle('forflow:feishu:task', (event, id: unknown) =>
    service(event).task(validated(feishuIdSchema, id))
  )
}
