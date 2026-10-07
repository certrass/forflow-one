import { z } from 'zod'
import { feishuProfileSchema } from './forflow-feishu'

export const ailyChatIdSchema = z
  .string()
  .regex(/^oc_[a-zA-Z0-9]+$/)
  .max(128)
export const ailyPartnerSchema = z.object({
  chatId: ailyChatIdSchema,
  name: z.string().min(1).max(256),
  botAppId: feishuProfileSchema,
  botMemberId: z.string().min(1).max(128)
})
export const ailyBindingSchema = z.object({
  profile: feishuProfileSchema,
  userId: z.string().min(1).max(128),
  partner: ailyPartnerSchema
})
export const ailySendSchema = z
  .object({
    text: z.string().trim().min(1).max(12_000),
    requestId: z.string().uuid()
  })
  .strict()
export type AilyPartner = z.infer<typeof ailyPartnerSchema>
export type AilyBinding = z.infer<typeof ailyBindingSchema>
export type AilyMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
}
export type AilyMessagePage = { messages: AilyMessage[]; olderPageToken: string | null }
export type ForflowAilyApi = {
  status(): Promise<{ installed: boolean; connection: AilyBinding | null }>
  discover(): Promise<{ partners: AilyPartner[]; hasMore: boolean }>
  connect(chatId: string): Promise<AilyBinding>
  disconnect(): Promise<void>
  messages(pageToken?: string): Promise<AilyMessagePage>
  send(input: z.infer<typeof ailySendSchema>): Promise<{ messageId: string }>
}
