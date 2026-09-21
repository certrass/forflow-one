import { z } from 'zod'

export const codexReviewScopeSchema = z.object({
  scope: z.enum(['all', 'orca']),
  range: z.enum(['7d', '30d', '90d', 'all'])
})
export const codexAnalyticsQuerySchema = codexReviewScopeSchema.extend({
  search: z.string().max(200).default(''),
  project: z.string().max(2000).default(''),
  order: z.enum(['recent', 'tokens', 'cost']).default('recent'),
  page: z.number().int().min(1).max(100000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20)
})
export type CodexAnalyticsQuery = z.infer<typeof codexAnalyticsQuerySchema>
export const codexAnalyticsRowSchema = z.object({
  sessionId: z.string(),
  title: z.string().nullable(),
  projectLabels: z.array(z.string()),
  models: z.array(z.string()),
  lastActiveAt: z.string(),
  totalTokens: z.number().nullable(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  cachedInputTokens: z.number().nullable(),
  events: z.number().nullable(),
  estimatedCostUsd: z.number().nullable(),
  unpricedEvents: z.number(),
  sourceFiles: z.number(),
  coverage: z.enum(['period', 'unavailable'])
})
export type CodexAnalyticsRow = z.infer<typeof codexAnalyticsRowSchema>
export type CodexAnalyticsResult = {
  rows: CodexAnalyticsRow[]
  total: number
  page: number
  pageSize: number
  projects: string[]
  reviews: Record<string, { id: string; status: CodexReviewStatus; versions: number }>
}
export const codexReviewSourceQuerySchema = codexReviewScopeSchema.extend({
  sessionId: z.string().min(1).max(256),
  focus: z.string().trim().min(1).max(2000),
  expectedRevision: z.number().int().min(0).optional()
})
export type CodexReviewSourceQuery = z.infer<typeof codexReviewSourceQuerySchema>
const auditRowSchema = z.object({
  kind: z.enum(['context', 'request', 'tool', 'data']),
  timestamp: z.string(),
  sourcePath: z.string(),
  byteOffset: z.number(),
  sessionId: z.string().nullable(),
  name: z.string(),
  recordId: z.string().nullable(),
  tokens: z.number().nullable(),
  hasResult: z.boolean().nullable(),
  evidenceKey: z.string().optional(),
  contentHash: z.string().optional(),
  resultSource: z
    .object({ sourcePath: z.string(), byteOffset: z.number(), contentHash: z.string() })
    .optional()
})
export const codexReviewAuditSchema = codexReviewScopeSchema.extend({
  status: z.enum(['ready', 'disabled']),
  updatedAt: z.number(),
  filesRead: z.number(),
  candidateFiles: z.number(),
  truncatedFiles: z.number(),
  failedFiles: z.number(),
  malformedLines: z.number(),
  skippedUnknownScope: z.number(),
  counts: z.object({
    context: z.number(),
    request: z.number(),
    tool: z.number(),
    data: z.number()
  }),
  toolResults: z.number(),
  rows: z.array(auditRowSchema),
  conflictingRecords: z.number().optional(),
  sources: z
    .array(
      z.object({
        path: z.string(),
        start: z.number(),
        end: z.number(),
        size: z.number(),
        sha256: z.string(),
        mtimeMs: z.number().optional()
      })
    )
    .optional()
})
const versionSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  focus: z.string(),
  usage: codexAnalyticsRowSchema,
  audit: codexReviewAuditSchema
})
const issueSchema = z.object({
  id: z.string(),
  versionId: z.string(),
  evidenceKey: z.string().nullable(),
  title: z.string().min(1).max(200),
  detail: z.string().max(4000),
  status: z.enum(['open', 'resolved', 'dismissed']),
  createdAt: z.number(),
  resolution: z.string().nullable(),
  resolvedInVersion: z.string().nullable()
})
export const codexReviewSchema = codexReviewScopeSchema.extend({
  id: z.string(),
  sessionId: z.string(),
  revision: z.number().int(),
  versions: z.array(versionSchema).min(1),
  issues: z.array(issueSchema),
  comments: z.array(
    z.object({
      id: z.string(),
      versionId: z.string(),
      issueId: z.string().nullable(),
      text: z.string().min(1).max(4100),
      createdAt: z.number()
    })
  ),
  confirmations: z.array(
    z.object({ versionId: z.string(), createdAt: z.number(), revision: z.number() })
  )
})
export type CodexReview = z.infer<typeof codexReviewSchema>
export type CodexReviewVersion = CodexReview['versions'][number]
export type CodexReviewStatus = 'unreviewed' | 'reviewing' | 'issues' | 'confirmed'
export const codexReviewMutationSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  expectedRevision: z.number().int().min(0),
  versionId: z.string().regex(/^[a-f0-9]{64}$/),
  action: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('comment'),
      text: z.string().trim().min(1).max(4000),
      issueId: z.string().optional()
    }),
    z.object({
      type: z.literal('issue'),
      title: z.string().trim().min(1).max(200),
      detail: z.string().trim().max(4000),
      evidenceKey: z.string().optional()
    }),
    z.object({
      type: z.literal('resolve'),
      issueId: z.string(),
      status: z.enum(['resolved', 'dismissed', 'open']),
      reason: z.string().trim().min(1).max(4000)
    }),
    z.object({ type: z.literal('confirm') })
  ])
})
export type CodexReviewMutation = z.infer<typeof codexReviewMutationSchema>
export function codexReviewStatus(review: CodexReview): CodexReviewStatus {
  if (review.issues.some((issue) => issue.status === 'open')) {
    return 'issues'
  }
  const latest = review.versions.at(-1)
  return review.confirmations.some(
    (entry) => entry.versionId === latest?.id && entry.revision === review.revision
  )
    ? 'confirmed'
    : 'reviewing'
}

export function codexEvidenceKey(row: z.infer<typeof auditRowSchema>): string {
  return row.evidenceKey ?? JSON.stringify([row.sessionId, row.sourcePath, row.byteOffset])
}
