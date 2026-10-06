import { z } from 'zod'

export const companionAgentSchema = z.enum(['aily', 'workbuddy'])
export type CompanionAgent = z.infer<typeof companionAgentSchema>

export function isCompanionAgent(value: unknown): value is CompanionAgent {
  return value === 'aily' || value === 'workbuddy'
}

export const companionTranscriptSchema = z.object({
  type: z.literal('forflow-companion-message'),
  id: z.string().min(1).max(512),
  role: z.enum(['user', 'assistant', 'system']),
  text: z.string().max(1_000_000),
  timestamp: z.number().finite()
})

export const companionLifecycleSchema = z.object({
  type: z.literal('forflow-companion-turn'),
  state: z.enum(['working', 'completed', 'interrupted']),
  turnId: z.string().min(1).max(512),
  timestamp: z.number().finite()
})
