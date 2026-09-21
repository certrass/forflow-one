import { readCodexReviewEvidence } from '../codex-usage/codex-review-evidence'
import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'
import { z } from 'zod'
import { jevAcceptSchema, jevPrepareSchema, jevRunSchema } from '../../shared/jev-audit-types'
import type { CodexReviewStore } from '../codex-usage/codex-review-store'
import type { CodexUsageStore } from '../codex-usage/store'
import { JevAuditService } from '../forflow/jev-audit-service'
import { JevAuditLedger } from '../forflow/jev-audit-ledger'
import { ForflowModelAccountStorage } from '../forflow/model-account-storage'
import { isForflowPrivateDeployment } from '../forflow/deployment-policy'
import { getMainHttpClient } from '../network/http-client'
import { isTrustedUIRenderer } from './ui'

export function registerJevAuditHandlers(
  reviews: Pick<CodexReviewStore, 'get' | 'mutate'>,
  usage: Pick<CodexUsageStore, 'getScanState'>,
  readEvidence: typeof readCodexReviewEvidence = readCodexReviewEvidence
): void {
  let instance: JevAuditService | undefined
  const service = (event: IpcMainInvokeEvent): JevAuditService => {
    if (
      !isForflowPrivateDeployment() ||
      event.senderFrame !== event.sender.mainFrame ||
      !isTrustedUIRenderer(event.sender)
    ) {
      throw new Error('Jev 审计仅支持 Forflow 桌面主界面。')
    }
    instance ??= new JevAuditService(
      reviews,
      new ForflowModelAccountStorage(app.getPath('userData')),
      new JevAuditLedger(join(app.getPath('userData'), 'forflow-jev-audit.json')),
      getMainHttpClient().fetch,
      () => usage.getScanState().enabled,
      readEvidence
    )
    return instance
  }
  ipcMain.handle('forflow:jev:prepare', (event, input: unknown) =>
    service(event).prepare(jevPrepareSchema.parse(input))
  )
  ipcMain.handle('forflow:jev:run', (event, input: unknown) =>
    service(event).run(jevRunSchema.parse(input))
  )
  ipcMain.handle('forflow:jev:list', (event, input: unknown) =>
    service(event).list(
      z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(input)
    )
  )
  ipcMain.handle('forflow:jev:accept', (event, input: unknown) =>
    service(event).accept(jevAcceptSchema.parse(input))
  )
}
