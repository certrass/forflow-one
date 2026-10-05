import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import type { CodexUsagePersistedState, CodexUsageSession } from './types'
import { readCodexUsageAudit } from './codex-usage-audit'

const timestamp = new Date().toISOString()
const workspace = { worktreeId: 'w', repoId: 'r', path: '/repo', displayName: 'Repo' }
const session: CodexUsageSession = {
  sessionId: 's',
  firstTimestamp: timestamp,
  lastTimestamp: timestamp,
  primaryModel: 'gpt-5',
  hasMixedModels: false,
  primaryProjectLabel: 'Repo',
  hasMixedLocations: false,
  primaryWorktreeId: 'w',
  primaryRepoId: 'r',
  eventCount: 1,
  longContextInputTokens: 0,
  longContextCachedInputTokens: 0,
  longContextOutputTokens: 0,
  totalInputTokens: 1,
  totalCachedInputTokens: 0,
  totalOutputTokens: 1,
  totalReasoningOutputTokens: 0,
  totalTokens: 2,
  hasInferredPricing: false,
  locationBreakdown: [
    {
      locationKey: 'w',
      projectLabel: 'Repo',
      repoId: 'r',
      worktreeId: 'w',
      eventCount: 1,
      longContextInputTokens: 0,
      longContextCachedInputTokens: 0,
      longContextOutputTokens: 0,
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 1,
      reasoningOutputTokens: 0,
      totalTokens: 2,
      hasInferredPricing: false
    }
  ],
  modelBreakdown: [],
  locationModelBreakdown: []
}
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})
function line(type: string, payload: unknown, time = timestamp) {
  return `${JSON.stringify({ timestamp: time, type, payload })}\n`
}
const context = line('turn_context', {
  cwd: '/repo',
  model: 'gpt-5',
  turn_id: 't',
  developer_instructions: 'DO NOT EXPOSE ME'
})
const request = line('token_usage_record', {
  response_id: 'response-1',
  session_id: 's',
  usage: { total_tokens: 42 }
})
const call = line('response_item', {
  type: 'function_call',
  name: 'exec',
  call_id: 'call-1',
  arguments: 'SECRET CONTENT'
})
const result = line('response_item', {
  type: 'function_call_output',
  call_id: 'call-1',
  output: 'PRIVATE DATA'
})
async function fixture(contents: string[]): Promise<CodexUsagePersistedState> {
  const dir = await mkdtemp(join(tmpdir(), 'forflow-audit-'))
  dirs.push(dir)
  const files = await Promise.all(
    contents.map(async (content, index) => {
      const path = join(dir, `${index}.jsonl`)
      await writeFile(path, content)
      return {
        path,
        mtimeMs: index,
        size: Buffer.byteLength(content),
        sessions: [session],
        dailyAggregates: [],
        ownedEventKeys: [],
        hasDeferredClaims: false
      }
    })
  )
  return {
    schemaVersion: 5,
    worktreeFingerprint: null,
    processedFiles: files,
    sessions: [session],
    dailyAggregates: [],
    scanState: { enabled: true, lastScanStartedAt: 1, lastScanCompletedAt: 2, lastScanError: null }
  }
}
const resolve = (cwd: string) => (cwd === '/repo' ? workspace : null)

describe('bounded Codex audit from actual JSONL metadata', () => {
  it('joins calls with results and deduplicates copied responses without adding token_count as another request', async () => {
    const state = await fixture([
      context + request + call + result,
      context +
        request +
        call +
        result +
        line('event_msg', { type: 'token_count', info: { last_token_usage: { total_tokens: 42 } } })
    ])
    const audit = await readCodexUsageAudit(state, 'all', '30d', resolve)
    expect(audit.counts).toEqual({ context: 1, request: 1, tool: 1, data: 0 })
    expect(audit.toolResults).toBe(1)
    expect(audit.rows.find((r) => r.kind === 'request')).toMatchObject({
      recordId: 'response-1',
      tokens: 42,
      byteOffset: Buffer.byteLength(context)
    })
    expect(JSON.stringify(audit)).not.toMatch(/SECRET CONTENT|PRIVATE DATA|DO NOT EXPOSE ME/)
  })
  it('filters each event by its own context, with unknown scope excluded and no final-context backfill', async () => {
    const state = await fixture([
      call +
        line('turn_context', { cwd: '/outside' }) +
        request +
        context +
        line('token_usage_record', { response_id: 'inside' })
    ])
    const audit = await readCodexUsageAudit(state, 'orca', 'all', resolve)
    expect(audit.counts.request).toBe(1)
    expect(audit.rows.some((r) => r.recordId === 'response-1')).toBe(false)
    expect(audit.skippedUnknownScope).toBe(1)
  })
  it('reads only bounded tails, handles partial and damaged lines, and never counts unreturned tools as successes', async () => {
    const state = await fixture([
      `${'x'.repeat(3 * 1024 * 1024)}\n${context}${request}${call}{broken}\n${result.trimEnd()}`
    ])
    const audit = await readCodexUsageAudit(state, 'orca', '30d', resolve)
    expect(audit.truncatedFiles).toBe(1)
    expect(audit.counts.request).toBe(1)
    expect(audit.malformedLines).toBe(1)
    expect(audit.incompleteLines).toBe(2)
    expect(audit.toolResults).toBe(0)
    expect(audit.rows.find((r) => r.kind === 'tool')?.hasResult).toBe(false)
  })
  it('bounds file count, reports missing files, and respects disabled tracking', async () => {
    const state = await fixture(Array.from({ length: 10 }, () => context + request))
    await rm(state.processedFiles[9].path)
    const audit = await readCodexUsageAudit(state, 'all', 'all', resolve)
    expect(audit).toMatchObject({ candidateFiles: 10, filesRead: 7, failedFiles: 1 })
    expect(audit.unreadSources).toEqual([
      { path: state.processedFiles[1].path, reason: 'file_limit' },
      { path: state.processedFiles[0].path, reason: 'file_limit' },
      { path: state.processedFiles[9].path, reason: 'read_failed' }
    ])
    state.scanState.enabled = false
    expect(await readCodexUsageAudit(state, 'all', 'all', resolve)).toMatchObject({
      status: 'disabled',
      filesRead: 0
    })
  })
  it('retains a complete first line when the bounded tail starts exactly at a newline boundary', async () => {
    const tailSize = 2 * 1024 * 1024
    const padding = 'x'.repeat(
      tailSize - Buffer.byteLength(context + line('ignored', { padding: '' }) + request)
    )
    const tail = context + line('ignored', { padding }) + request
    expect(Buffer.byteLength(tail)).toBe(tailSize)
    const state = await fixture([line('session_meta', { id: 's', cwd: '/repo' }) + tail])
    const audit = await readCodexUsageAudit(state, 'orca', 'all', resolve)
    expect(audit).toMatchObject({ truncatedFiles: 1, incompleteLines: 0, skippedUnknownScope: 0 })
    expect(audit.counts).toEqual({ context: 1, request: 1, tool: 0, data: 0 })
  })
  it('applies calendar range to records and limits visible detail independently of counts', async () => {
    const state = await fixture([
      context +
        line('token_usage_record', { response_id: 'old' }, '2000-01-01T00:00:00Z') +
        Array.from({ length: 20 }, (_, i) =>
          line('token_usage_record', { response_id: `r${i}` })
        ).join('')
    ])
    const audit = await readCodexUsageAudit(state, 'all', '7d', resolve)
    expect(audit.counts.request).toBe(20)
    expect(audit.rows.filter((r) => r.kind === 'request')).toHaveLength(12)
    expect(audit.omittedRows).toBe(8)
    expect(audit.rows.some((r) => r.recordId === 'old')).toBe(false)
  })
  it('indexes canonical user and assistant messages once with source hashes, without leaking their bodies', async () => {
    const user = line('response_item', {
      type: 'message',
      role: 'user',
      id: 'user-1',
      content: [{ type: 'input_text', text: '保留旧功能并给出测试证据' }]
    })
    const assistant = line('response_item', {
      type: 'message',
      role: 'assistant',
      id: 'assistant-1',
      content: [{ type: 'output_text', text: '已完成，但尚未验证整包' }]
    })
    const contents =
      context +
      user +
      assistant +
      line('event_msg', { type: 'user_message', message: '保留旧功能并给出测试证据' }) +
      line('event_msg', { type: 'agent_message', message: '已完成，但尚未验证整包' }) +
      line('response_item', { type: 'message', role: 'developer', content: 'PRIVATE INSTRUCTIONS' })
    const state = await fixture([contents, contents])
    const audit = await readCodexUsageAudit(state, 'all', 'all', resolve)
    expect(audit.messageCounts).toEqual({ user: 1, assistant: 1 })
    const messages = audit.rows.filter((row) => row.recordFormat === 'response_message')
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({
      kind: 'context',
      messageRole: 'user',
      recordId: 'user-1',
      sourcePath: state.processedFiles[1].path,
      byteOffset: Buffer.byteLength(context),
      contentHash: createHash('sha256').update(user.trimEnd()).digest('hex'),
      unsupportedContentBlocks: 0
    })
    const bytes = await readFile(messages[0].sourcePath)
    const start = messages[0].byteOffset
    const original = bytes.toString('utf8', start, bytes.indexOf(10, start))
    expect(JSON.parse(original)).toMatchObject({ payload: { role: 'user', id: 'user-1' } })
    expect(createHash('sha256').update(original).digest('hex')).toBe(messages[0].contentHash)
    expect(JSON.stringify(audit)).not.toMatch(/保留旧功能|尚未验证整包|PRIVATE INSTRUCTIONS/)
    expect(audit.incompleteLines).toBe(0)
    expect(audit.omittedRows).toBe(0)
  })
  it('keeps compressed history distinct and exposes missing message content instead of substituting a summary', async () => {
    const state = await fixture([
      context +
        line('compacted', { message: '压缩摘要不是逐条原文' }) +
        line('response_item', {
          type: 'message',
          role: 'assistant',
          summary: [{ text: '摘要中声称通过' }],
          content: [{ type: 'summary_text', text: '摘要中声称通过' }]
        }) +
        line('response_item', {
          type: 'message',
          role: 'user',
          content: [
            { type: 'input_text', text: '请审阅图片' },
            { type: 'input_image', image_url: 'private' }
          ]
        })
    ])
    const audit = await readCodexUsageAudit(state, 'all', 'all', resolve)
    expect(audit.rows.filter((row) => row.recordFormat === 'compaction')).toHaveLength(1)
    expect(audit.rows.find((row) => row.messageRole === 'assistant')).toMatchObject({
      messageTextChars: 0,
      unsupportedContentBlocks: 1
    })
    expect(audit.rows.find((row) => row.messageRole === 'user')).toMatchObject({
      messageTextChars: 5,
      unsupportedContentBlocks: 1
    })
  })
  it('does not collapse identical text from different turns or accept conflicting message ids silently', async () => {
    const message = line('response_item', {
      type: 'message',
      role: 'user',
      id: 'm',
      content: '继续'
    })
    const state = await fixture([
      context +
        message +
        line('response_item', { type: 'message', role: 'user', id: 'm', content: '停止' }) +
        line('turn_context', { cwd: '/repo', turn_id: 't2' }) +
        message
    ])
    const audit = await readCodexUsageAudit(state, 'all', 'all', resolve, { rowLimit: 1 })
    expect(audit.messageCounts).toEqual({ user: 2, assistant: 0 })
    expect(audit.conflictingRecords).toBe(1)
    expect(audit.omittedRows).toBe(3)
  })
})
