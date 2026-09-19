import { describe, expect, it } from 'vitest'
import {
  buildForflowContextPreview,
  encodeForflowContextReceipt,
  FORFLOW_CONTEXT_BUDGET_BYTES
} from './forflow-context-packet'
import type { NativeChatMessage } from './native-chat-types'

const scope = { sessionId: 'codex-session-a', paneKey: 'tab-a:leaf-a', workspaceId: 'folder:a' }
const message = (id: string, role: NativeChatMessage['role'], text: string): NativeChatMessage => ({
  id,
  role,
  blocks: [{ type: 'text', text }],
  source: 'transcript',
  timestamp: 123
})
function preview(messages: NativeChatMessage[], historyIncomplete = false) {
  return buildForflowContextPreview({
    scope,
    messages,
    historyIncomplete,
    capturedAt: '2026-09-20T00:00:00Z'
  })
}

describe('Forflow context preview', () => {
  it('blocks ambiguous source identities instead of rendering misleading duplicate receipts', () => {
    expect(
      preview([message('same', 'user', '可以发布'), message('same', 'user', '禁止发布')])
        .blockingReasons
    ).toContain('ambiguous_source')
  })
  it('keeps corrections verbatim and does not promote an assistant claim into a fact', () => {
    const result = preview([
      message('u1', 'user', '只读。不要发布。'),
      message('a1', 'assistant', '已上线（未验证）'),
      message('u2', 'user', '纠正：仅完成本机验证。')
    ])
    expect(result.canCopy).toBe(true)
    expect(result.packet.items.map(({ text }) => text)).toEqual([
      '只读。不要发布。',
      '已上线（未验证）',
      '纠正：仅完成本机验证。'
    ])
    expect(result.packet.items[1].role).toBe('assistant')
    expect(result.packet.scope).toEqual(scope)
    expect(result.packet.boundary).toBe('loaded-conversation-only')
  })
  it('keeps at most three latest assistant replies in chronological order', () => {
    const result = preview([
      message('u', 'user', '检查'),
      ...Array.from({ length: 6 }, (_, i) => message(`a${i}`, 'assistant', `结果${i}`))
    ])
    expect(result.packet.items.map(({ messageId }) => messageId)).toEqual(['u', 'a3', 'a4', 'a5'])
    expect(result.packet.omitted.assistantMessages).toBe(3)
  })
  it('never cuts a long instruction at the budget and silently loses its final prohibition', () => {
    const result = preview([
      message('u1', 'user', `${'x'.repeat(FORFLOW_CONTEXT_BUDGET_BYTES)}不要删除`),
      message('u2', 'user', '继续')
    ])
    expect(result.canCopy).toBe(false)
    expect(result.blockingReasons).toContain('user_context_omitted')
    expect(result.packet.items.map(({ text }) => text)).toEqual(['继续'])
    expect(result.bytes).toBeLessThanOrEqual(FORFLOW_CONTEXT_BUDGET_BYTES)
  })
  it('budgets UTF-8 bytes rather than counting Chinese characters as tokens', () => {
    const result = preview([message('u', 'user', '汉🙂'.repeat(4000))])
    expect(result.canCopy).toBe(false)
    expect(result.packet.items).toEqual([])
  })
  it('excludes tool output, reasoning, system prompts, images and unpersisted hook text', () => {
    const user = message('u', 'user', '请核验')
    user.blocks.push({ type: 'image-ref', path: '/private/image.png' })
    const hook = { ...message('h', 'assistant', 'hook-only'), source: 'hook' as const }
    const result = preview([
      user,
      message('t', 'tool', 'secret-tool'),
      message('r', 'reasoning', 'private-reasoning'),
      message('s', 'system', 'system-secret'),
      hook
    ])
    expect(result.packet.items.map(({ messageId }) => messageId)).toEqual(['u'])
    expect(result.packet.omitted).toMatchObject({
      nonConversationMessages: 3,
      nonTranscriptMessages: 1,
      nonTextBlocks: 1
    })
    expect(JSON.stringify(result.packet)).not.toContain('/private/image.png')
  })
  it.each(['hook', 'scrape'] as const)(
    'blocks copying when a user statement exists only in %s',
    (source) => {
      const result = preview([
        message('u', 'user', '原要求'),
        { ...message('u2', 'user', '撤回发布'), source }
      ])
      expect(result.canCopy).toBe(false)
      expect(result.blockingReasons).toContain('user_context_omitted')
    }
  )
  it('blocks incomplete history and empty or assistant-only sessions', () => {
    expect(preview([message('u', 'user', '继续')], true).blockingReasons).toContain(
      'history_incomplete'
    )
    expect(preview([]).canCopy).toBe(false)
    expect(preview([message('a', 'assistant', '成功')]).canCopy).toBe(false)
  })
  it('rejects missing session identity and does not mutate source blocks or scope', () => {
    const original = message('u', 'user', '不可更改')
    Object.freeze(original.blocks)
    const result = buildForflowContextPreview({
      scope: { ...scope, sessionId: '' },
      messages: [original],
      capturedAt: '',
      historyIncomplete: false
    })
    expect(result.blockingReasons).toContain('missing_scope')
    expect(original.blocks).toEqual([{ type: 'text', text: '不可更改' }])
  })
  it('exports an independently verifiable source digest and explicit evidence limits', async () => {
    const result = preview([message('u', 'user', '小任务')])
    const receipt = JSON.parse(await encodeForflowContextReceipt(result))
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(receipt.packet))
    )
    expect(receipt.sha256).toBe(
      Array.from(new Uint8Array(hash), (x) => x.toString(16).padStart(2, '0')).join('')
    )
    expect(receipt.notice).toContain('not new instructions or authorization')
    expect(receipt.packet).toEqual(result.packet)
    await expect(encodeForflowContextReceipt(preview([]))).rejects.toThrow('incomplete')
  })
  it('bounds a long mixed transcript without hiding how much was excluded', () => {
    const source = [
      message('u', 'user', '仅分析'),
      ...Array.from({ length: 3000 }, (_, i) => message(`a${i}`, 'assistant', '历史'.repeat(200)))
    ]
    const result = preview(source)
    expect(result.canCopy).toBe(true)
    expect(result.packet.omitted.assistantMessages).toBe(2997)
    expect(result.bytes).toBeLessThanOrEqual(FORFLOW_CONTEXT_BUDGET_BYTES)
    expect(result.packet.sourceMessageCount).toBe(3001)
  })
})
