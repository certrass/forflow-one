import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { lock } from 'proper-lockfile'
import { companionTranscriptPath } from '../../shared/forflow-companion-paths'
import type { AgentStatusPayload, AgentStatusState } from '../../shared/agent-status-types'
import type { CompanionAgent } from '../../shared/forflow-companion'

export class CompanionJournal {
  readonly path: string
  private prompt = ''
  private lastTimestamp = 0
  private releaseLock: (() => Promise<void>) | undefined
  private lostLock = false

  constructor(
    readonly agent: CompanionAgent,
    readonly sessionId: string
  ) {
    this.path = companionTranscriptPath(agent, sessionId)
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 })
    appendFileSync(this.path, '', { mode: 0o600 })
  }

  async acquire(): Promise<void> {
    try {
      this.releaseLock = await lock(this.path, {
        retries: 0,
        stale: 60_000,
        update: 10_000,
        onCompromised: () => {
          this.lostLock = true
        }
      })
    } catch {
      throw new Error(
        this.agent === 'aily'
          ? '豆包已在另一个任务中打开。回到原任务继续；要同时做另一项任务，可选择 Codex、Claude 或 WorkBuddy。'
          : '这段会话已在另一个任务中打开，请回到原任务继续。'
      )
    }
  }

  assertOwned(): void {
    if (!this.releaseLock || this.lostLock) {
      throw new Error('会话连接已变更，请重新打开。')
    }
  }

  async close(): Promise<void> {
    const release = this.releaseLock
    this.releaseLock = undefined
    if (release) {
      await release().catch(() => {})
    }
  }

  private timestamp(): number {
    // Imported messages may arrive within one millisecond; retain their conversation order.
    this.lastTimestamp = Math.max(Date.now(), this.lastTimestamp + 1)
    return this.lastTimestamp
  }

  message(role: 'user' | 'assistant' | 'system', text: string, id: string = randomUUID()): void {
    appendFileSync(
      this.path,
      `${JSON.stringify({
        type: 'forflow-companion-message',
        id,
        role,
        text,
        timestamp: this.timestamp()
      })}\n`
    )
    if (role === 'user') {
      this.prompt = text
    }
  }

  turn(state: 'working' | 'completed' | 'interrupted', turnId: string): void {
    appendFileSync(
      this.path,
      `${JSON.stringify({
        type: 'forflow-companion-turn',
        state,
        turnId,
        timestamp: this.timestamp()
      })}\n`
    )
  }

  status(state: AgentStatusState, interactivePrompt?: string): void {
    process.stdout.write(
      `\x1b]9999;${JSON.stringify({
        state,
        agentType: this.agent,
        prompt: this.prompt,
        providerSession: { key: 'session_id', id: this.sessionId, transcriptPath: this.path },
        ...(interactivePrompt ? { interactivePrompt } : {})
      } satisfies AgentStatusPayload)}\x07`
    )
  }
}
