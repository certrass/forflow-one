import {
  registerWorkspaceReviewHandlers,
  assertWorkspaceReviewRenderer,
  type WorkspaceReviewDependencies
} from './workspace-review-handlers'
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
export function registerCodexReviewHandlers(
  usage: CodexUsageStore,
  deps?: WorkspaceReviewDependencies
): void {
  const reviews = new CodexReviewStore(
    join(app.getPath('userData'), 'forflow-session-reviews.json'),
    (query) => {
      if ('workspaceId' in query) {
        throw new Error('会话审阅需要选择会话')
      }
      return usage.getReviewSource(query)
    }
  )
  const workspace = deps ? registerWorkspaceReviewHandlers(deps, usage) : undefined
  const storeFor = (id: string) => (workspace?.reviews.has(id) ? workspace.reviews : reviews)
  const readEvidence: typeof readCodexReviewEvidence = async (review, versionId, key, part) => {
    const version = review.versions.find((entry) => entry.id === versionId)
    if (version?.workspace?.files.some((file) => file.evidenceKey === key)) {
      if (!workspace || part === 'result') {
        throw new Error('工作区文件没有工具返回值')
      }
      return workspace.source.readEvidence(version.workspace, key)
    }
    if (!usage.getScanState().enabled) {
      throw new Error('请先启用 Codex 使用情况读取')
    }
    return readCodexReviewEvidence(review, versionId, key, part)
  }
  registerJevAuditHandlers(
    { get: (id) => storeFor(id).get(id), mutate: (input) => storeFor(input.id).mutate(input) },
    usage,
    readEvidence
  )
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
  ipcMain.handle('codexUsage:getReview', (event, input: unknown) => {
    const key = id.parse(input)
    if (workspace?.reviews.has(key)) {
      assertWorkspaceReviewRenderer(event)
    }
    return storeFor(key).get(key)
  })
  ipcMain.handle('codexUsage:updateReview', (event, input: unknown) => {
    const args = codexReviewMutationSchema.parse(input)
    if (workspace?.reviews.has(args.id)) {
      assertWorkspaceReviewRenderer(event)
    }
    return storeFor(args.id).mutate(args)
  })
  ipcMain.handle('codexUsage:readReviewEvidence', (event, input: unknown) => {
    const args = z
      .object({
        id,
        versionId: id,
        evidenceKey: z.string().max(4000),
        part: z.enum(['record', 'result']).optional()
      })
      .parse(input)
    if (workspace?.reviews.has(args.id)) {
      assertWorkspaceReviewRenderer(event)
    }
    return readEvidence(storeFor(args.id).get(args.id), args.versionId, args.evidenceKey, args.part)
  })
}
