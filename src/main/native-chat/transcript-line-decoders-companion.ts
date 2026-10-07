import type { NativeChatMessage, NativeChatTurnLifecycle } from '../../shared/native-chat-types'
import { companionLifecycleSchema, companionTranscriptSchema } from '../../shared/forflow-companion'

export function decodeCompanionTranscriptLine(line: string): NativeChatMessage | null {
  try {
    const result = companionTranscriptSchema.safeParse(JSON.parse(line))
    if (!result.success) {
      return null
    }
    const { id, role, text, timestamp } = result.data
    return { id, role, blocks: [{ type: 'text', text }], timestamp, source: 'transcript' }
  } catch {
    return null
  }
}

export function decodeCompanionTurnLifecycle(line: string): NativeChatTurnLifecycle | null {
  try {
    const result = companionLifecycleSchema.safeParse(JSON.parse(line))
    if (!result.success) {
      return null
    }
    const { state, turnId, timestamp } = result.data
    return { state, turnId, timestamp }
  } catch {
    return null
  }
}
