import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { resolveWorkBuddyCli } from '../../shared/workbuddy-cli-location'
import { CompanionJournal } from './companion-journal'
import { WorkBuddyConnection } from './workbuddy-connection'

const sessionSchema = z.object({ sessionId: z.string().min(1), cwd: z.string() })
const initializationSchema = z.object({
  protocolVersion: z.literal(1),
  agentCapabilities: z.object({ loadSession: z.boolean().optional() }).optional()
})
const permissionSchema = z.object({
  options: z
    .array(z.object({ optionId: z.string(), name: z.string(), kind: z.string() }))
    .min(1)
    .max(12),
  toolCall: z.object({ title: z.string().optional() }).passthrough()
})
const updateSchema = z.object({
  update: z
    .object({
      sessionUpdate: z.string(),
      content: z.object({ type: z.string(), text: z.string().optional() }).optional()
    })
    .passthrough()
})

export class WorkBuddyConversation {
  journal: CompanionJournal | null = null
  private connection: WorkBuddyConnection | null = null
  private providerId = ''
  private reply = ''
  private permission: {
    id: string | number
    options: z.infer<typeof permissionSchema>['options']
  } | null = null

  constructor(private readonly cwd: string) {}

  async open(resume?: string): Promise<CompanionJournal> {
    const program = resolveWorkBuddyCli()
    if (!program) {
      throw new Error('未找到 WorkBuddy。请先安装并在 WorkBuddy 中登录。')
    }
    this.journal = new CompanionJournal('workbuddy', resume ?? randomUUID())
    await this.journal.acquire()
    this.connection = new WorkBuddyConnection(program, this.cwd, (method, params, id) =>
      this.receive(method, params, id)
    )
    try {
      const initialized = initializationSchema.parse(
        await this.connection.request(
          'initialize',
          {
            protocolVersion: 1,
            clientCapabilities: {},
            clientInfo: { name: 'forflow-one', version: '1' }
          },
          30_000
        )
      )
      if (resume) {
        if (!initialized.agentCapabilities?.loadSession) {
          throw new Error('当前 WorkBuddy CLI 不支持继续历史会话，请更新 WorkBuddy。')
        }
        const saved = sessionSchema.parse(
          JSON.parse(readFileSync(`${this.journal.path}.session.json`, 'utf8'))
        )
        if (saved.cwd !== this.cwd) {
          throw new Error('请在原工作区中继续这段 WorkBuddy 会话。')
        }
        this.providerId = saved.sessionId
        await this.connection.request('session/load', {
          sessionId: this.providerId,
          cwd: this.cwd,
          mcpServers: []
        })
      } else {
        const created = z
          .object({ sessionId: z.string().min(1) })
          .parse(await this.connection.request('session/new', { cwd: this.cwd, mcpServers: [] }))
        this.providerId = created.sessionId
        writeFileSync(
          `${this.journal.path}.session.json`,
          JSON.stringify({ sessionId: this.providerId, cwd: this.cwd }),
          { mode: 0o600 }
        )
      }
      this.reply = ''
      process.stdout.write('WorkBuddy · 输入 /exit 退出\n')
      this.journal.status('done')
      return this.journal
    } catch (error) {
      await this.close()
      throw error
    }
  }

  private receive(method: string, params: unknown, id?: string | number): void {
    if (method === 'session/update') {
      const parsed = updateSchema.safeParse(params)
      if (
        parsed.success &&
        parsed.data.update.sessionUpdate === 'agent_message_chunk' &&
        parsed.data.update.content?.type === 'text'
      ) {
        const text = parsed.data.update.content.text ?? ''
        if (this.reply.length + text.length <= 1_000_000) {
          this.reply += text
          process.stdout.write(text)
        }
      }
    } else if (method === 'session/request_permission' && id !== undefined) {
      const parsed = permissionSchema.safeParse(params)
      if (!parsed.success || this.permission) {
        this.connection?.answer(id, { outcome: { outcome: 'cancelled' } })
        return
      }
      this.permission = { id, options: parsed.data.options }
      const question = parsed.data.toolCall.title ?? 'WorkBuddy 请求执行操作'
      const labels = parsed.data.options.map((option, index) => `${index + 1}. ${option.name}`)
      process.stdout.write(
        `\n${question}\n${labels.join('\n')}\n输入选项编号，或 Ctrl+C 取消。\n> `
      )
      this.journal?.status(
        'waiting',
        JSON.stringify({
          questions: [
            {
              question,
              header: '操作授权',
              options: parsed.data.options.map((option) => ({
                label: option.name,
                description: ''
              })),
              multiSelect: false
            }
          ]
        })
      )
    } else if (id !== undefined) {
      this.connection?.refuse(id)
    }
  }

  answer(text: string): boolean {
    if (!this.permission) {
      return false
    }
    const named = this.permission.options.findIndex((option) => option.name === text)
    const index = named !== -1 ? named : /^\d+$/.test(text) ? Number.parseInt(text, 10) - 1 : -1
    const option = this.permission.options[index]
    if (!option) {
      process.stdout.write('请输入上面的选项编号。\n> ')
      return true
    }
    this.connection?.answer(this.permission.id, {
      outcome: { outcome: 'selected', optionId: option.optionId }
    })
    this.permission = null
    this.journal?.status('working')
    return true
  }

  async send(text: string): Promise<void> {
    if (!this.connection || !this.journal) {
      throw new Error('会话尚未连接。')
    }
    this.journal.assertOwned()
    const turnId = randomUUID()
    this.reply = ''
    this.journal.message('user', text)
    this.journal.turn('working', turnId)
    this.journal.status('working')
    try {
      const result = z.object({ stopReason: z.string() }).parse(
        await this.connection.request('session/prompt', {
          sessionId: this.providerId,
          prompt: [{ type: 'text', text }]
        })
      )
      if (this.reply) {
        this.journal.message('assistant', this.reply)
      }
      this.journal.turn(result.stopReason === 'end_turn' ? 'completed' : 'interrupted', turnId)
    } catch (error) {
      this.journal.turn('interrupted', turnId)
      throw error
    } finally {
      this.journal.status('done')
      process.stdout.write('\n')
    }
  }

  cancel(): void {
    if (this.permission) {
      this.connection?.answer(this.permission.id, { outcome: { outcome: 'cancelled' } })
    }
    this.permission = null
    this.connection?.notify('session/cancel', { sessionId: this.providerId })
  }

  async close(): Promise<void> {
    this.cancel()
    await this.connection?.close()
    await this.journal?.close()
  }
}
