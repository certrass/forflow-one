import { z } from 'zod'

const probability = z.number().min(0).max(1)
export const jevChoiceQuestionSchema = z.object({
  type: z.literal('choice'),
  instructions: z.string(),
  criteria: z.record(z.string(), z.string())
})
export const jevQuestionSchema = z.discriminatedUnion('type', [
  jevChoiceQuestionSchema,
  z.object({
    type: z.literal('noul'),
    instructions: z.string(),
    criteria: z.object({ true: z.string(), false: z.string() }).strict()
  }),
  z.object({
    type: z.literal('score'),
    instructions: z.string(),
    criteria: z.array(z.string()).min(2)
  })
])
export const jevChoiceAnswerSchema = z.object({
  type: z.literal('choice'),
  choice: z.string(),
  confidence: probability,
  probabilities: z.record(z.string(), probability)
})
export const jevAnswerSchema = z.discriminatedUnion('type', [
  jevChoiceAnswerSchema,
  z.object({ type: z.literal('noul'), noul: probability }),
  z.object({
    type: z.literal('score'),
    score: z.number().nonnegative(),
    confidence: probability,
    legend: z.record(z.string(), z.string()),
    probabilities: z.record(z.string(), probability)
  })
])
export const jevResponseSchema = z.object({
  model: z.string().max(160),
  answers: z.record(z.string(), jevAnswerSchema),
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative()
  })
})
export type JevQuestion = z.infer<typeof jevQuestionSchema>
export type JevAnswer = z.infer<typeof jevAnswerSchema>
export type JevResponse = z.infer<typeof jevResponseSchema>
export type JevLegacyResponse = Omit<JevResponse, 'answers'> & {
  answers: Record<string, z.infer<typeof jevChoiceAnswerSchema>>
}

export type JevLegacyRequest = {
  model: string
  state: { focus: string; claim: string; record: string; result: string | null; partial: boolean }
  questions: Record<string, z.infer<typeof jevChoiceQuestionSchema>>
}
export type JevDeliveryRequest = {
  model: string
  state: {
    object: { kind: string; id: string; version: string }
    goal: string
    targetCriterion: { id: string; text: string }
    sources: {
      id: string
      role: string
      text: string
      truncated: boolean
      omitted: boolean
    }[]
    handoff: { sourceIds: string[] }
    coverage: {
      selection: string
      wholeProject: boolean
      partial: boolean
      truncated: boolean
      omitted: boolean
    }
  }
  questions: Record<string, JevQuestion>
}
export type JevRequest = JevLegacyRequest | JevDeliveryRequest
