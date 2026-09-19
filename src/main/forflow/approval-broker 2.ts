import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { ForflowApprovalRequest } from '../../shared/forflow-approval'
import { getTrustedUIRendererWebContents, isTrustedUIRenderer } from '../ipc/ui'
import { isForflowPrivateDeployment } from './deployment-policy'

export const FORFLOW_APPROVAL_TIMEOUT_MS = 120_000
export const FORFLOW_UPLOAD_CANCELLED = '已取消数据传输；未获得本次操作的确认。'
const pending = new Map<
  string,
  { request: ForflowApprovalRequest; rendererId: number; settle(allow: boolean): void }
>()

export function assertForflowTransferSender(event: IpcMainInvokeEvent): void {
  if (
    isForflowPrivateDeployment() &&
    (event.senderFrame !== event.sender.mainFrame || !isTrustedUIRenderer(event.sender))
  ) {
    throw new Error('数据操作仅允许由 Forflow 桌面主界面发起。')
  }
}

export function registerForflowApprovalHandlers(): void {
  ipcMain.handle('forflow:approval:pending', (event) => {
    assertForflowTransferSender(event)
    return [...pending.values()]
      .filter((entry) => entry.rendererId === event.sender.id)
      .map((entry) => entry.request)
  })
  ipcMain.handle('forflow:approval:decide', (event, id: unknown, allow: unknown) => {
    assertForflowTransferSender(event)
    const entry = pending.get(z.string().uuid().parse(id))
    const decision = z.boolean().parse(allow)
    if (!entry || entry.rendererId !== event.sender.id) {
      return false
    }
    entry.settle(decision && Date.now() < entry.request.expiresAt)
    return true
  })
}

export function requestForflowApproval(
  details: Pick<ForflowApprovalRequest, 'kind' | 'destination' | 'description'>,
  signal?: AbortSignal
): Promise<boolean> {
  if (!isForflowPrivateDeployment()) {
    return Promise.resolve(true)
  }
  const renderer = getTrustedUIRendererWebContents()
  if (!renderer || signal?.aborted || pending.size >= 8) {
    return Promise.resolve(false)
  }
  const request = {
    ...details,
    id: randomUUID(),
    expiresAt: Date.now() + FORFLOW_APPROVAL_TIMEOUT_MS
  }
  return new Promise((resolve) => {
    const notify = (): void => {
      if (!renderer.isDestroyed()) {
        renderer.send('forflow:approval:changed')
      }
    }
    const cancel = (): void => settle(false)
    const navigation = (
      _event: unknown,
      _url: string,
      _inPlace: boolean,
      mainFrame: boolean
    ): void => {
      if (mainFrame) {
        cancel()
      }
    }
    const settle = (allow: boolean): void => {
      if (!pending.delete(request.id)) {
        return
      }
      clearTimeout(timer)
      renderer.off('destroyed', cancel)
      renderer.off('render-process-gone', cancel)
      renderer.off('did-start-navigation', navigation)
      signal?.removeEventListener('abort', cancel)
      notify()
      resolve(allow)
    }
    const timer = setTimeout(cancel, FORFLOW_APPROVAL_TIMEOUT_MS)
    timer.unref()
    pending.set(request.id, { request, rendererId: renderer.id, settle })
    renderer.once('destroyed', cancel)
    renderer.once('render-process-gone', cancel)
    renderer.on('did-start-navigation', navigation)
    signal?.addEventListener('abort', cancel, { once: true })
    notify()
  })
}
