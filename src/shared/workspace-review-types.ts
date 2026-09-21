import { z } from 'zod'

export const workspaceReviewTargetSchema = z.object({
  id: z.string().min(1),
  selector: z.string().min(1),
  kind: z.enum(['worktree', 'folder']),
  hostId: z.string().min(1),
  name: z.string(),
  rootPath: z.string(),
  projectId: z.string().nullable(),
  available: z.boolean(),
  unavailableReason: z.string().nullable()
})
export type WorkspaceReviewTarget = z.infer<typeof workspaceReviewTargetSchema>

export const workspaceReviewSelectionSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().trim().min(1).max(2000),
        kind: z.enum(['code', 'document', 'verification'])
      })
    )
    .min(1)
    .max(40),
  sessionIds: z.array(z.string().min(1).max(256)).max(12).default([]),
  policyReference: z.string().trim().max(4000).default(''),
  applicability: z.enum(['unconfirmed', 'applies', 'not_applicable']).default('unconfirmed'),
  applicabilityReason: z.string().trim().max(2000).default('')
})
export const workspaceReviewQuerySchema = z
  .object({
    workspaceId: z.string().min(1).max(2000),
    selection: workspaceReviewSelectionSchema,
    focus: z.string().trim().min(1).max(2000),
    expectedRevision: z.number().int().nonnegative().optional()
  })
  .refine(
    (query) =>
      query.selection.applicability !== 'not_applicable' ||
      query.selection.applicabilityReason.length > 0,
    {
      message: '标记不适用时请记录理由',
      path: ['selection', 'applicabilityReason']
    }
  )
export type WorkspaceReviewQuery = z.infer<typeof workspaceReviewQuerySchema>

export const workspaceSensitiveSignalSchema = z.object({
  id: z.string(),
  category: z.enum(['credential', 'personal_data', 'confidential_marker']),
  ruleId: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  flow: z.literal('unknown'),
  authorization: z.literal('unknown')
})
export type WorkspaceSensitiveSignal = z.infer<typeof workspaceSensitiveSignalSchema>

export const workspaceReviewFileSchema = z.object({
  path: z.string(),
  kind: z.enum(['code', 'document', 'verification']),
  evidenceKey: z.string(),
  status: z.enum(['read', 'missing', 'unreadable', 'too_large', 'binary', 'unsafe']),
  contentHash: z.string().nullable(),
  size: z.number().nullable(),
  mtimeMs: z.number().nullable(),
  reason: z.string().nullable(),
  signals: z.array(workspaceSensitiveSignalSchema)
})
export type WorkspaceReviewFile = z.infer<typeof workspaceReviewFileSchema>
export const workspaceReviewGitSchema = z.object({
  status: z.enum(['ready', 'unavailable', 'not_applicable']),
  head: z.string().nullable(),
  branch: z.string().nullable(),
  changes: z.array(z.object({ path: z.string(), status: z.string() })),
  reason: z.string().nullable()
})
export type WorkspaceReviewGit = z.infer<typeof workspaceReviewGitSchema>
export const workspaceReviewSnapshotSchema = z.object({
  target: workspaceReviewTargetSchema,
  rootIdentity: z.string(),
  selection: workspaceReviewSelectionSchema,
  files: z.array(workspaceReviewFileSchema),
  git: workspaceReviewGitSchema,
  ruleVersion: z.literal('workspace-evidence-v1'),
  partial: z.boolean(),
  gaps: z.array(z.string())
})
export type WorkspaceReviewSnapshot = z.infer<typeof workspaceReviewSnapshotSchema>
