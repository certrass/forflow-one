import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import {
  ailyBindingSchema,
  ailyChatIdSchema,
  ailySendSchema,
  type AilyBinding,
  type AilyPartner,
  type AilyMessagePage
} from '../../shared/forflow-aily'
import { writeCredentialFileAtomic } from '../integration-credential-file'
import { FeishuCliClient, type FeishuCliDependencies } from './feishu-cli-client'
import { readFeishuAccount } from './feishu-cli-contract'
import {
  ailyChatsSchema,
  ailyCliData,
  readAilyMessages,
  readAilyPartner
} from './aily-cli-contract'

export class AilyClient {
  private readonly file: string
  private readonly cli: FeishuCliClient
  private generation = 0
  private sending = false
  private pinned: AilyBinding | null = null

  pinConnection(binding: AilyBinding): void {
    this.pinned = ailyBindingSchema.parse(binding)
  }

  private assertPinned(binding: AilyBinding): void {
    if (
      this.pinned &&
      (binding.profile !== this.pinned.profile ||
        binding.userId !== this.pinned.userId ||
        binding.partner.chatId !== this.pinned.partner.chatId ||
        binding.partner.botMemberId !== this.pinned.partner.botMemberId)
    ) {
      throw new Error('当前飞书账号或伙伴已变更，请重新打开会话。')
    }
  }

  constructor(
    private readonly directory: string,
    deps?: FeishuCliDependencies
  ) {
    this.file = join(directory, 'forflow-aily-connection.json')
    this.cli = new FeishuCliClient(directory, deps)
  }

  private binding(): AilyBinding | null {
    try {
      return ailyBindingSchema.parse(JSON.parse(readFileSync(this.file, 'utf8')))
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return null
      }
      throw new Error('工作伙伴连接配置无法读取，请重新连接。')
    }
  }

  async status(): Promise<{ installed: boolean; connection: AilyBinding | null }> {
    return { installed: await this.cli.installed(), connection: this.binding() }
  }

  private async identity(profile?: string) {
    return readFeishuAccount(
      await this.cli.command(
        [...(profile ? ['--profile', profile] : []), 'auth', 'status', '--json'],
        'messages'
      )
    ).connection
  }

  private async discoverFor(
    profile: string
  ): Promise<{ partners: AilyPartner[]; hasMore: boolean }> {
    const partners: AilyPartner[] = []
    let pageToken: string | undefined
    for (let page = 0; page < 5; page++) {
      const data = ailyChatsSchema.parse(
        ailyCliData(
          await this.cli.command(
            [
              '--profile',
              profile,
              'im',
              '+chat-list',
              '--as',
              'user',
              '--types',
              'p2p',
              '--sort',
              'active_time',
              '--page-size',
              '100',
              '--format',
              'json',
              ...(pageToken ? ['--page-token', pageToken] : [])
            ],
            'messages'
          )
        )
      )
      for (const chat of data.chats) {
        if (chat.chat_mode !== 'p2p' || !/(的智能伙伴|的工作伙伴)$/.test(chat.name)) {
          continue
        }
        const partner = await this.partner(profile, chat.chat_id)
        if (partner) {
          partners.push(partner)
        }
      }
      if (!data.has_more) {
        return { partners, hasMore: false }
      }
      if (!data.page_token) {
        throw new Error('飞书会话分页信息缺失，请刷新后重试。')
      }
      pageToken = data.page_token
    }
    return { partners, hasMore: true }
  }

  private async partner(profile: string, chatId: string): Promise<AilyPartner | null> {
    return readAilyPartner(
      chatId,
      await this.cli.command(
        [
          '--profile',
          profile,
          'im',
          '+chat-members-list',
          '--chat-id',
          chatId,
          '--member-types',
          'bot',
          '--as',
          'user',
          '--format',
          'json'
        ],
        'messages'
      )
    )
  }

  async discover(): Promise<{ partners: AilyPartner[]; hasMore: boolean }> {
    const identity = await this.identity()
    return this.discoverFor(identity.appId)
  }

  async connect(chatId: string): Promise<AilyBinding> {
    const generation = ++this.generation
    const id = ailyChatIdSchema.parse(chatId)
    const account = await this.identity()
    const found = (await this.discoverFor(account.appId)).partners.find((p) => p.chatId === id)
    if (!found) {
      throw new Error('未找到这个工作伙伴，请刷新列表后重新选择。')
    }
    const current = await this.identity(account.appId)
    if (
      generation !== this.generation ||
      current.userId !== account.userId ||
      current.appId !== account.appId
    ) {
      throw new Error('飞书账号已变更，请重新连接。')
    }
    const binding = { profile: account.appId, userId: account.userId, partner: found }
    mkdirSync(this.directory, { recursive: true, mode: 0o700 })
    writeCredentialFileAtomic(this.file, Buffer.from(JSON.stringify(binding)))
    return binding
  }

  disconnect(): void {
    ++this.generation
    rmSync(this.file, { force: true })
  }

  private async boundCommand(args: string[]): Promise<{ value: unknown; binding: AilyBinding }> {
    const binding = this.binding()
    if (!binding) {
      throw new Error('先连接飞书中的智能伙伴。')
    }
    this.assertPinned(binding)
    const generation = this.generation
    const assertAccount = async (): Promise<void> => {
      const saved = this.binding()
      if (!saved) {
        throw new Error('工作伙伴连接已关闭。')
      }
      this.assertPinned(saved)
      const current = await this.identity(binding.profile)
      if (
        generation !== this.generation ||
        current.userId !== binding.userId ||
        current.appId !== binding.profile
      ) {
        throw new Error('飞书账号或工作伙伴已变更，请重新连接。')
      }
    }
    await assertAccount()
    const value = await this.cli.command(
      [
        '--profile',
        binding.profile,
        'im',
        ...args,
        '--chat-id',
        binding.partner.chatId,
        '--as',
        'user',
        '--format',
        'json'
      ],
      'messages'
    )
    await assertAccount()
    return { value, binding }
  }

  async messages(pageToken?: string): Promise<AilyMessagePage> {
    const token = z.string().max(4096).optional().parse(pageToken)
    const { value, binding } = await this.boundCommand([
      '+chat-messages-list',
      '--order',
      'desc',
      '--page-size',
      '50',
      '--no-reactions',
      ...(token ? ['--page-token', token] : [])
    ])
    return readAilyMessages(value, binding)
  }

  async send(input: z.infer<typeof ailySendSchema>): Promise<{ messageId: string }> {
    const request = ailySendSchema.parse(input)
    if (this.sending) {
      throw new Error('上一条消息正在发送，请稍候。')
    }
    this.sending = true
    try {
      const { value } = await this.boundCommand([
        '+messages-send',
        '--text',
        request.text,
        '--idempotency-key',
        request.requestId
      ])
      const result = z.object({ message_id: z.string().min(1) }).parse(ailyCliData(value))
      return { messageId: result.message_id }
    } finally {
      this.sending = false
    }
  }
}
