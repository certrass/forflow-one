import { z } from 'zod'
import {
  ailyPartnerSchema,
  type AilyBinding,
  type AilyMessagePage,
  type AilyPartner
} from '../../shared/forflow-aily'
import { cliEnvelopeSchema } from './feishu-cli-contract'

export function ailyCliData(value: unknown): unknown {
  const result = cliEnvelopeSchema.safeParse(value)
  if (!result.success) {
    throw new Error('飞书未返回个人会话数据，请重新登录后重试。')
  }
  return result.data.data
}

export const ailyChatsSchema = z.object({
  chats: z.array(
    z.object({ chat_id: z.string(), name: z.string().default(''), chat_mode: z.string() })
  ),
  has_more: z.boolean(),
  page_token: z.string().optional()
})
const botsSchema = z.object({
  bots: z.array(z.object({ app_id: z.string(), member_id: z.string(), name: z.string() }))
})

export function readAilyPartner(chatId: string, value: unknown): AilyPartner | null {
  const bots = botsSchema.parse(ailyCliData(value)).bots
  if (bots.length !== 1) {
    return null
  }
  const bot = bots[0]
  // The product-name bot is a notification channel; personal partners handle conversations.
  if (!bot.name.endsWith('的智能伙伴') && !bot.name.endsWith('的工作伙伴')) {
    return null
  }
  return ailyPartnerSchema.parse({
    chatId,
    name: bot.name,
    botAppId: bot.app_id,
    botMemberId: bot.member_id
  })
}

const messagesSchema = z.object({
  messages: z.array(
    z.object({
      message_id: z.string(),
      content: z.string().default(''),
      create_time: z.string().default(''),
      deleted: z.boolean().optional(),
      sender: z.object({ id: z.string(), sender_type: z.string() })
    })
  ),
  has_more: z.boolean(),
  page_token: z.string().optional()
})

export function readAilyMessages(value: unknown, binding: AilyBinding): AilyMessagePage {
  const data = messagesSchema.parse(ailyCliData(value))
  if (data.has_more && !data.page_token) {
    throw new Error('飞书消息分页信息缺失，请刷新后重试。')
  }
  return {
    messages: data.messages
      .filter((message) => !message.deleted)
      .flatMap((message) => {
        const role =
          message.sender.sender_type === 'user' && message.sender.id === binding.userId
            ? ('user' as const)
            : message.sender.sender_type === 'app' &&
                [binding.partner.botAppId, binding.partner.botMemberId].includes(message.sender.id)
              ? ('assistant' as const)
              : null
        return role
          ? [{ id: message.message_id, role, text: message.content, time: message.create_time }]
          : []
      })
      .toReversed(),
    olderPageToken: data.has_more ? (data.page_token ?? null) : null
  }
}
