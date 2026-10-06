import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { AilyClient } from '../../main/forflow/aily-client'
import { companionDirectory } from '../../shared/forflow-companion-paths'
import { companionTranscriptSchema } from '../../shared/forflow-companion'
import { CompanionJournal } from './companion-journal'

export class AilyConversation {
  readonly client = new AilyClient(companionDirectory('aily'))
  journal: CompanionJournal | null = null
  private readonly seen = new Set<string>()
  private stopped = false

  async open(resume?: string): Promise<CompanionJournal> {
    let { connection } = await this.client.status()
    if (!connection) {
      const { partners } = await this.client.discover()
      if (partners.length !== 1) {
        throw new Error(
          partners.length === 0
            ? '先在飞书中打开你的智能伙伴，发送一条消息，再重新启动。'
            : `找到多个伙伴，请用 forflow aily --connect <会话编号> 选择：\n${partners
                .map((p) => `${p.name}  ${p.chatId}`)
                .join('\n')}`
        )
      }
      connection = await this.client.connect(partners[0].chatId)
    }
    this.client.pinConnection(connection)
    const id = createHash('sha256')
      .update(JSON.stringify([connection.profile, connection.userId, connection.partner.chatId]))
      .digest('hex')
      .slice(0, 32)
    if (resume && resume !== id) {
      throw new Error('当前飞书伙伴与这段历史不同，请切回原账号和伙伴。')
    }
    this.journal = new CompanionJournal('aily', id)
    await this.journal.acquire()
    for (const line of readFileSync(this.journal.path, 'utf8').split('\n')) {
      try {
        const result = companionTranscriptSchema.safeParse(JSON.parse(line))
        if (result.success) {
          this.seen.add(result.data.id)
        }
      } catch {
        /* A partial final record is recovered by the next refresh. */
      }
    }
    process.stdout.write(
      `豆包工作伙伴 · ${connection.partner.name}\n继续飞书里的同一段对话。输入 /exit 退出。\n`
    )
    await this.refresh()
    this.journal.status('done')
    return this.journal
  }

  private async refresh(): Promise<boolean> {
    const page = await this.client.messages()
    let reply = false
    for (const message of page.messages) {
      if (this.seen.has(message.id)) {
        continue
      }
      this.seen.add(message.id)
      this.journal?.message(message.role, message.text, message.id)
      process.stdout.write(`\n${message.role === 'user' ? '你' : '智能伙伴'}：${message.text}\n`)
      if (message.role === 'assistant') {
        reply = true
      }
    }
    return reply
  }

  async send(text: string): Promise<void> {
    if (!this.journal) {
      throw new Error('会话尚未连接。')
    }
    this.journal.assertOwned()
    this.stopped = false
    await this.refresh()
    const turnId = randomUUID()
    const result = await this.client.send({ text, requestId: turnId })
    this.seen.add(result.messageId)
    this.journal.message('user', text, result.messageId)
    this.journal.turn('working', turnId)
    this.journal.status('working')
    const deadline = Date.now() + 180_000
    while (!this.stopped && Date.now() < deadline) {
      await delay(2000)
      if (this.stopped) {
        break
      }
      this.journal.assertOwned()
      if (await this.refresh()) {
        this.journal.turn('completed', turnId)
        this.journal.status('done')
        return
      }
    }
    this.journal.turn('interrupted', turnId)
    this.journal.message('system', '已停止等待。消息已发到飞书，可输入 /refresh 查看后续回复。')
    this.journal.status('done')
  }

  async refreshHistory(): Promise<void> {
    await this.refresh()
  }
  cancel(): void {
    this.stopped = true
  }
  async close(): Promise<void> {
    this.cancel()
    await this.journal?.close()
  }
}
