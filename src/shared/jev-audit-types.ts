import { z } from 'zod'
import type { CodexReview } from './codex-review-types'
import { jevResponseSchema } from './jev-native-types'
export * from './jev-native-types'

export const JEV_MODEL = 'jev-1.13.0'
export const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
export const JEV_QUESTION_VERSION = 'forflow-review-v2'
export const JEV_DELIVERY_QUESTION_VERSION = 'forflow-delivery-v1'
declare const __FORFLOW_JEV_EVALUATOR_HASH__: string
export const JEV_DELIVERY_EVALUATOR_VERSION = `forflow-delivery-evaluator-v1:${
  typeof __FORFLOW_JEV_EVALUATOR_HASH__ === 'string' ? __FORFLOW_JEV_EVALUATOR_HASH__ : 'unbuilt'
}`
export const JEV_DELIVERY_EVALUATION_SUITE_HASH: string | null = null
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/)
const evidenceKeySchema = z.string().min(1).max(4000)
export const jevLegacyPrepareSchema = z
  .object({
    mode: z.literal('legacy').optional(),
    reviewId: hashSchema,
    versionId: hashSchema,
    evidenceKey: evidenceKeySchema,
    claim: z.string().trim().max(2000).default('')
  })
  .strict()
export const jevDeliveryPrepareSchema = z
  .object({
    mode: z.literal('delivery'),
    reviewId: hashSchema,
    versionId: hashSchema,
    evidenceKeys: z.array(evidenceKeySchema).min(1).max(12),
    handoffEvidenceKeys: z.array(evidenceKeySchema).max(12)
  })
  .strict()
  .refine(
    (input) =>
      new Set(input.evidenceKeys).size === input.evidenceKeys.length &&
      new Set(input.handoffEvidenceKeys).size === input.handoffEvidenceKeys.length &&
      input.handoffEvidenceKeys.every((key) => input.evidenceKeys.includes(key)),
    '交接材料必须是已选择证据的子集，证据不能重复。'
  )
export const jevPrepareSchema = z.union([jevLegacyPrepareSchema, jevDeliveryPrepareSchema])
export type JevLegacyPrepareInput = z.infer<typeof jevLegacyPrepareSchema>
export type JevDeliveryPrepareInput = z.infer<typeof jevDeliveryPrepareSchema>
export type JevPrepareInput = z.infer<typeof jevPrepareSchema>
export const jevDeliveryBasisSchema = z.object({
  criterion: z.string().min(1).max(2000),
  sourceFingerprints: z.array(z.object({ evidenceKey: evidenceKeySchema, sha256: hashSchema })),
  questionHash: hashSchema,
  evaluatorVersion: z.string(),
  evaluationSuiteHash: hashSchema.nullable()
})
export type JevDeliveryBasis = z.infer<typeof jevDeliveryBasisSchema>
type JevPreviewFields = {
  id: string
  inputHash: string
  expiresAt: number
  body: string
}
export type JevPreview = JevPreviewFields &
  (JevLegacyPrepareInput | (JevDeliveryPrepareInput & { basis: JevDeliveryBasis }))
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
  mode: z.enum(['legacy', 'delivery']).optional(),
  evidenceKeys: z.array(evidenceKeySchema).min(1).max(12).optional(),
  handoffEvidenceKeys: z.array(evidenceKeySchema).max(12).optional(),
  basis: jevDeliveryBasisSchema.optional(),
  legacyClaim: z.string().max(2000).optional(),
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
    question: z.enum([
      'outcome',
      'evidence',
      'claim',
      'criterion_clarity',
      'criterion_evidence',
      'documented_current_nonconformance',
      'handoff_operability',
      'handoff_criterion_coverage'
    ]),
    expectedRevision: z.number().int().nonnegative()
  })
  .strict()
export type JevAuditApi = {
  prepare: (input: JevPrepareInput) => Promise<JevPreview>
  run: (input: z.infer<typeof jevRunSchema>) => Promise<JevReceipt>
  list: (reviewId: string) => Promise<JevReceipt[]>
  accept: (input: z.infer<typeof jevAcceptSchema>) => Promise<CodexReview>
}
