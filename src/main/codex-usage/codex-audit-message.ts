type AuditMessage = {
  role: 'user' | 'assistant'
  text: string
  unsupportedContentBlocks: number
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function readCodexAuditMessage(payload: Record<string, unknown>): AuditMessage | null {
  if (payload.type !== 'message' || (payload.role !== 'user' && payload.role !== 'assistant')) {
    return null
  }
  const content = payload.content
  if (typeof content === 'string') {
    return { role: payload.role, text: content, unsupportedContentBlocks: 0 }
  }
  const parts: string[] = []
  let unsupportedContentBlocks = 0
  if (Array.isArray(content)) {
    for (const block of content) {
      if (
        object(block) &&
        (block.type === 'text' || block.type === 'input_text' || block.type === 'output_text') &&
        typeof block.text === 'string'
      ) {
        parts.push(block.text)
      } else {
        unsupportedContentBlocks++
      }
    }
  } else {
    unsupportedContentBlocks++
  }
  return { role: payload.role, text: parts.join('\n'), unsupportedContentBlocks }
}
