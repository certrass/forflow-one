import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import { z } from 'zod'
import {
  codexAnalyticsQuerySchema,
  codexReviewSourceQuerySchema,
  codexReviewMutationSchema
} from '../../shared/codex-review-types'
import type { CodexUsageStore } from '../codex-usage/store'
import { CodexReviewStore } from '../codex-usage/codex-review-store'
import { readCodexReviewEvidence } from '../codex-usage/codex-review-evidence'
import { registerJevAuditHandlers } from './jev-audit-handlers'

const id = z.string().regex(/^[a-f0-9]{64}$/)
export function registerCodexReviewHandlers(usage: CodexUsageStore): void {
  const reviews = new CodexReviewStore(
    join(app.getPath('userData'), 'forflow-session-reviews.json'),
    (query) => usage.getReviewSource(query)
  )
  registerJevAuditHandlers(reviews, usage)
  ipcMain.handle('codexUsage:getAnalytics', async (_event, input: unknown) => {
    const query = codexAnalyticsQuerySchema.parse(input)
    return {
      ...(await usage.getAnalytics(query)),
      reviews: reviews.summaries(query.scope, query.range)
    }
  })
  ipcMain.handle('codexUsage:openReview', (_event, input: unknown) =>
    reviews.open(codexReviewSourceQuerySchema.parse(input))
  )
  ipcMain.handle('codexUsage:getReview', (_event, input: unknown) => reviews.get(id.parse(input)))
  ipcMain.handle('codexUsage:updateReview', (_event, input: unknown) =>
    reviews.mutate(codexReviewMutationSchema.parse(input))
  )
  ipcMain.handle('codexUsage:readReviewEvidence', (_event, input: unknown) => {
    if (!usage.getScanState().enabled) {
      throw new Error('请先启用 Codex 使用情况读取')
    }
    const args = z
      .object({
        id,
        versionId: id,
        evidenceKey: z.string().max(4000),
        part: z.enum(['record', 'result']).optional()
      })
      .parse(input)
    return readCodexReviewEvidence(
      reviews.get(args.id),
      args.versionId,
      args.evidenceKey,
      args.part
    )
  })
}
