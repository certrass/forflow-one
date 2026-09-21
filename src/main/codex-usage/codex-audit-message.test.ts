import { describe, expect, it } from 'vitest'
import { readCodexAuditMessage } from './codex-audit-message'

describe('canonical Codex audit message content', () => {
  it('preserves full Unicode text and excludes summary and non-text blocks', () => {
    const first = '需要证据而不是摘要。'.repeat(2000)
    expect(
      readCodexAuditMessage({
        type: 'message',
        role: 'user',
        summary: [{ text: 'summary' }],
        content: [
          { type: 'input_text', text: first },
          { type: 'text', text: '下一段' },
          { type: 'summary_text', text: 'summary' },
          { type: 'input_image', image_url: 'private' }
        ]
      })
    ).toEqual({ role: 'user', text: `${first}\n下一段`, unsupportedContentBlocks: 2 })
  })
  it('rejects internal roles, event mirrors and reasoning summaries', () => {
    for (const payload of [
      { type: 'message', role: 'developer', content: 'instructions' },
      { type: 'user_message', message: 'mirror' },
      { type: 'reasoning', summary: [{ text: 'summary' }] }
    ]) {
      expect(readCodexAuditMessage(payload)).toBeNull()
    }
  })
  it('marks missing content rather than filling it from summary', () => {
    expect(
      readCodexAuditMessage({ type: 'message', role: 'assistant', summary: 'all done' })
    ).toEqual({ role: 'assistant', text: '', unsupportedContentBlocks: 1 })
    expect(readCodexAuditMessage({ type: 'message', role: 'assistant', content: [] })).toEqual({
      role: 'assistant',
      text: '',
      unsupportedContentBlocks: 0
    })
  })
})
