import { z } from 'zod'
import type { CodexReview } from './codex-review-types'

export const JEV_MODEL = 'jev-1.13.0'
export const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
export const JEV_QUESTION_VERSION = 'forflow-review-v2'
export const jevQuestionSchema = z.object({
  type: z.literal('choice'),
  instructions: z.string(),
  criteria: z.record(z.string(), z.string())
})
export const jevAnswerSchema = z.object({
  type: z.literal('choice'),
  choice: z.string(),
  confidence: z.number().min(0).max(1),
  probabilities: z.record(z.string(), z.number().min(0).max(1))
})
export const jevResponseSchema = z.object({
  model: z.string().max(160),
  answers: z.record(z.string(), jevAnswerSchema),
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative()
  })
})
export type JevRequest = {
  model: string
  state: { focus: string; claim: string; record: string; result: string | null; partial: boolean }
  questions: Record<string, z.infer<typeof jevQuestionSchema>>
}
export type JevResponse = z.infer<typeof jevResponseSchema>
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/)
export const jevPrepareSchema = z
  .object({
    reviewId: hashSchema,
    versionId: hashSchema,
    evidenceKey: z.string().min(1).max(4000),
    claim: z.string().trim().max(2000).default('')
  })
  .strict()
export type JevPrepareInput = z.infer<typeof jevPrepareSchema>
export type JevPreview = JevPrepareInput & {
  id: string
  inputHash: string
  expiresAt: number
  body: string
}
export const jevRunSchema = z
  .object({
    id: z.string().uuid(),
    inputHash: hashSchema
  })
  .strict()
export const jevReceiptSchema = z.object({
  id: z.string().uuid(),
  reviewId: hashSchema,
  versionId: hashSchema,
  evidenceKey: z.string().max(4000),
  inputHash: hashSchema,
  questionVersion: z.string(),
  requestedModel: z.string(),
  createdAt: z.number(),
  completedAt: z.number().nullable(),
  status: z.enum(['pending', 'completed', 'rejected', 'unknown']),
  result: jevResponseSchema.nullable(),
  error: z.string().nullable()
})
export type JevReceipt = z.infer<typeof jevReceiptSchema>
export const jevAcceptSchema = z
  .object({
    receiptId: z.string().uuid(),
    question: z.enum(['outcome', 'evidence', 'claim']),
    expectedRevision: z.number().int().nonnegative()
  })
  .strict()
export type JevAuditApi = {
  prepare: (input: JevPrepareInput) => Promise<JevPreview>
  run: (input: z.infer<typeof jevRunSchema>) => Promise<JevReceipt>
  list: (reviewId: string) => Promise<JevReceipt[]>
  accept: (input: z.infer<typeof jevAcceptSchema>) => Promise<CodexReview>
}
