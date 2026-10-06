import { homedir } from 'node:os'
import { join } from 'node:path'
import type { CompanionAgent } from './forflow-companion'

export function companionDirectory(agent: CompanionAgent): string {
  return join(homedir(), '.forflow-one', 'companions', agent)
}

export function companionTranscriptPath(agent: CompanionAgent, sessionId: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
    throw new Error('会话编号无效。')
  }
  return join(companionDirectory(agent), 'sessions', `${sessionId}.jsonl`)
}
