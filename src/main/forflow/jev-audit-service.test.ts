import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JEV_MODEL, type JevReceipt } from '../../shared/jev-audit-types'
import { setSecretStore, _resetSecretStoreForTests } from '../../shared/secret-store'
import { CodexReviewStore } from '../codex-usage/codex-review-store'
import type { CodexReviewSource } from '../codex-usage/codex-review-version'
import { JevAuditService } from './jev-audit-service'
import { JevAuditLedger } from './jev-audit-ledger'
import { ForflowModelAccountStorage } from './model-account-storage'

const dirs: string[] = []
afterEach(async () => {
  vi.useRealTimers()
  _resetSecretStoreForTests()
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })))
})
async function fixture(configured = true) {
  const dir = await mkdtemp(join(tmpdir(), 'jev-audit-'))
  dirs.push(dir)
  setSecretStore({
    isEncryptionAvailable: () => true,
    describeProtectionGap: () => null,
    encryptString: (text) => Buffer.from(Buffer.from(text).map((byte) => byte ^ 77)),
    decryptString: (bytes) => Buffer.from(bytes.map((byte) => byte ^ 77)).toString('utf8')
  })
  const accounts = new ForflowModelAccountStorage(dir)
  if (configured) {
    accounts.save({ provider: 'jev', model: JEV_MODEL, apiKey: 'synthetic-credential' })
  }
  const path = join(dir, 'log.jsonl')
  const record = `${JSON.stringify({
    type: 'function_call',
    name: 'exec',
    arguments: '{"API_KEY":"sensitive-record-value","cmd":"false"}'
  })}\n`
  await writeFile(path, record)
  const source: CodexReviewSource = {
    usage: {
      sessionId: 'test-session',
      title: 'Test',
      projectLabels: [],
      models: [],
      lastActiveAt: new Date().toISOString(),
      totalTokens: 2,
      inputTokens: 1,
      outputTokens: 1,
      cachedInputTokens: 0,
      events: 1,
      estimatedCostUsd: null,
      unpricedEvents: 1,
      sourceFiles: 1,
      coverage: 'period'
    },
    audit: {
      scope: 'all',
      range: 'all',
      status: 'ready',
      updatedAt: 1,
      filesRead: 1,
      candidateFiles: 1,
      truncatedFiles: 0,
      failedFiles: 0,
      malformedLines: 0,
      skippedUnknownScope: 0,
      conflictingRecords: 0,
      messageCounts: { user: 0, assistant: 0 },
      omittedRows: 0,
      incompleteLines: 0,
      unreadSources: [],
      counts: { context: 0, request: 0, tool: 1, data: 0 },
      toolResults: 0,
      sources: [
        {
          path,
          start: 0,
          end: Buffer.byteLength(record),
          size: Buffer.byteLength(record),
          sha256: createHash('sha256').update(record).digest('hex')
        }
      ],
      rows: [
        {
          kind: 'tool',
          timestamp: new Date().toISOString(),
          sourcePath: path,
          byteOffset: 0,
          sessionId: 'test-session',
          name: 'exec',
          recordId: 'tool-id',
          tokens: null,
          hasResult: false,
          evidenceKey: 'evidence'
        }
      ]
    }
  }
  const reviews = new CodexReviewStore(join(dir, 'reviews.json'), async () => source)
  const query = {
    sessionId: 'test-session',
    scope: 'all' as const,
    range: 'all' as const,
    focus: 'Did the tool complete?'
  }
  const review = await reviews.open(query)
  const ledger = new JevAuditLedger(join(dir, 'jev.json'))
  const send = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          model: JEV_MODEL,
          answers: {
            outcome: {
              type: 'choice',
              choice: 'unknown',
              confidence: 1,
              probabilities: { attention: 0, none: 0, unknown: 1 }
            },
            evidence: {
              type: 'choice',
              choice: 'missing',
              confidence: 1,
              probabilities: { sufficient: 0, missing: 1, unknown: 0 }
            }
          },
          usage: { input_tokens: 100, output_tokens: 0 }
        }),
        { headers: { 'content-type': 'application/json' } }
      )
  )
  let enabled = true
  const service = new JevAuditService(reviews, accounts, ledger, send, () => enabled)
  const input = {
    reviewId: review.id,
    versionId: review.versions[0].id,
    evidenceKey: 'evidence',
    claim: ''
  }
  return {
    dir,
    path,
    accounts,
    source,
    reviews,
    review,
    query,
    ledger,
    send,
    service,
    input,
    disable: () => {
      enabled = false
    }
  }
}

describe('Jev review lifecycle', () => {
  it('bounds simultaneous previews and releases reservations after a failed prepare', async () => {
    const f = await fixture()
    await expect(
      f.service.prepare({ ...f.input, evidenceKey: 'missing-evidence' })
    ).rejects.toThrow('不属于当前审阅版本')
    const outcomes = await Promise.allSettled(
      Array.from({ length: 21 }, () => f.service.prepare(f.input))
    )
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(20)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1)
    await expect(f.service.prepare(f.input)).rejects.toThrow('预览数量已达上限')
    expect(f.send).not.toHaveBeenCalled()
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 11 * 60_000)
    await expect(f.service.prepare(f.input)).resolves.toMatchObject({
      reviewId: f.input.reviewId
    })
  })

  it.each<{ label: string; missing: Partial<CodexReviewSource['audit']> }>([
    { label: 'bounded but complete source', missing: {} },
    { label: 'unread file', missing: { candidateFiles: 2 } },
    { label: 'row limit', missing: { omittedRows: 1 } },
    { label: 'incomplete line', missing: { incompleteLines: 1 } },
    { label: 'unclassified scope', missing: { skippedUnknownScope: 1 } },
    { label: 'legacy row coverage', missing: { omittedRows: undefined } },
    { label: 'legacy line coverage', missing: { incompleteLines: undefined } },
    { label: 'legacy file coverage', missing: { unreadSources: undefined } },
    { label: 'legacy message coverage', missing: { messageCounts: undefined } }
  ])('carries $label into the exact preview partial flag', async ({ missing }) => {
    const f = await fixture()
    Object.assign(f.source.audit, missing)
    const updated = await f.reviews.open({ ...f.query, expectedRevision: f.review.revision })
    const preview = await f.service.prepare({ ...f.input, versionId: updated.versions.at(-1)!.id })
    expect(JSON.parse(preview.body).state.partial).toBe(Object.keys(missing).length > 0)
    expect(f.send).not.toHaveBeenCalled()
  })
  it('persists message identity and previews verified text without images or summaries', async () => {
    const f = await fixture()
    const message = `${JSON.stringify({
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'output_text', text: '本次只保存了配置，尚未连接验证。' },
          { type: 'image', image_url: 'private-image-bytes' },
          { type: 'summary_text', text: 'invented-summary-claim' }
        ]
      }
    })}\n`
    await writeFile(f.path, message)
    f.source.audit.sources![0] = {
      path: f.path,
      start: 0,
      end: Buffer.byteLength(message),
      size: Buffer.byteLength(message),
      sha256: createHash('sha256').update(message).digest('hex')
    }
    Object.assign(f.source.audit.rows[0], {
      kind: 'context',
      messageRole: 'assistant',
      recordFormat: 'response_message',
      messageTextChars: 20,
      unsupportedContentBlocks: 2
    })
    const updated = await f.reviews.open({ ...f.query, expectedRevision: f.review.revision })
    const reloaded = new CodexReviewStore(join(f.dir, 'reviews.json'), async () => f.source)
    expect(reloaded.get(updated.id).versions.at(-1)!.audit.rows[0]).toMatchObject({
      messageRole: 'assistant',
      recordFormat: 'response_message',
      unsupportedContentBlocks: 2
    })
    const preview = await f.service.prepare({ ...f.input, versionId: updated.versions.at(-1)!.id })
    const state = JSON.parse(preview.body).state
    expect(state.record).toContain('本次只保存了配置，尚未连接验证。')
    expect(state.record).not.toMatch(/private-image-bytes|invented-summary-claim/)
    expect(state.partial).toBe(true)
    expect(f.send).not.toHaveBeenCalled()
    f.source.audit.rows[0].messageTextChars = 0
    const empty = await f.reviews.open({ ...f.query, expectedRevision: updated.revision })
    await expect(
      f.service.prepare({ ...f.input, versionId: empty.versions.at(-1)!.id })
    ).rejects.toThrow('没有可读取的文字正文')
  })
  it('includes the fingerprint-verified paired return and redacts its nested data', async () => {
    const f = await fixture()
    const original = await readFile(f.path, 'utf8')
    const output = `${JSON.stringify({ type: 'function_call_output', output: 'Exit code 1 for user@example.com' })}\n`
    const combined = original + output
    await writeFile(f.path, combined)
    f.source.audit.sources![0] = {
      path: f.path,
      start: 0,
      end: Buffer.byteLength(combined),
      size: Buffer.byteLength(combined),
      sha256: createHash('sha256').update(combined).digest('hex')
    }
    f.source.audit.rows[0].resultSource = {
      sourcePath: f.path,
      byteOffset: Buffer.byteLength(original),
      contentHash: createHash('sha256').update(output).digest('hex')
    }
    f.source.audit.rows[0].hasResult = true
    const updated = await f.reviews.open({ ...f.query, expectedRevision: f.review.revision })
    const preview = await f.service.prepare({ ...f.input, versionId: updated.versions.at(-1)!.id })
    expect(JSON.parse(preview.body).state.result).toContain('Exit code 1')
    expect(preview.body).not.toContain('user@example.com')
    expect(f.send).not.toHaveBeenCalled()
  })
  it('previews locally without credentials, redacts nested secrets, and refuses sending without a key', async () => {
    const f = await fixture(false)
    const preview = await f.service.prepare(f.input)
    expect(preview.body).not.toContain('sensitive-record-value')
    expect(preview.body).toContain('[redacted]')
    expect(f.send).not.toHaveBeenCalled()
    await expect(f.service.run(preview)).rejects.toThrow('API Key')
    expect(f.ledger.all()).toEqual([])
  })
  it('sends exactly the preview once, persists usage without raw evidence, and accepts an issue idempotently', async () => {
    const f = await fixture()
    const preview = await f.service.prepare(f.input)
    const [receipt, duplicate] = await Promise.all([f.service.run(preview), f.service.run(preview)])
    expect(duplicate).toEqual(receipt)
    expect(receipt.status).toBe('completed')
    expect(f.send).toHaveBeenCalledOnce()
    expect(f.send).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: preview.body })
    )
    await f.service.run(preview)
    expect(f.send).toHaveBeenCalledOnce()
    const disk = await readFile(join(f.dir, 'jev.json'), 'utf8')
    expect(disk).not.toMatch(
      /synthetic-credential|sensitive-record-value|Did the tool complete|cmd/
    )
    expect(JSON.parse(disk).receipts[0].result.usage.input_tokens).toBe(100)
    const action = {
      receiptId: receipt.id,
      question: 'evidence' as const,
      expectedRevision: f.review.revision
    }
    const updated = await f.service.accept(action)
    expect(updated.issues).toHaveLength(1)
    expect(updated.issues[0].evidenceKey).toBe('evidence')
    expect(updated.confirmations).toHaveLength(0)
    expect((await f.service.accept(action)).issues).toHaveLength(1)
    const reopened = new JevAuditService(
      f.reviews,
      f.accounts,
      new JevAuditLedger(join(f.dir, 'jev.json')),
      f.send,
      () => true
    )
    expect(reopened.list(f.review.id)[0]).toEqual(receipt)
  })
  it.each(['source', 'version', 'scan', 'model', 'hash'] as const)(
    'blocks sending after %s changes',
    async (change) => {
      const f = await fixture()
      const preview = await f.service.prepare(f.input)
      if (change === 'source') {
        await writeFile(f.path, '{}\n')
      }
      if (change === 'version') {
        await f.reviews.open({
          ...f.query,
          focus: 'Different focus',
          expectedRevision: f.review.revision
        })
      }
      if (change === 'scan') {
        f.disable()
      }
      if (change === 'model') {
        f.accounts.save({ provider: 'jev', model: 'jev-1.12.0' })
      }
      if (change === 'hash') {
        preview.inputHash = '0'.repeat(64)
      }
      await expect(f.service.run(preview)).rejects.toThrow()
      expect(f.send).not.toHaveBeenCalled()
      expect(f.ledger.all()).toEqual([])
    }
  )
  it.each(['forflow-review-v1', 'forflow-review-future'])(
    'preserves %s receipts but refuses adopting their suggestions under current questions',
    async (questionVersion) => {
      const f = await fixture()
      const preview = await f.service.prepare(f.input)
      const receipt = { ...(await f.service.run(preview)), questionVersion }
      f.ledger.put(receipt)
      await expect(
        f.service.accept({
          receiptId: receipt.id,
          question: 'evidence',
          expectedRevision: f.review.revision
        })
      ).rejects.toThrow('问题版本')
      expect(f.service.list(f.review.id)).toEqual([receipt])
      expect(f.reviews.get(f.review.id)).toEqual(f.review)
      expect(f.send).toHaveBeenCalledOnce()
    }
  )
  it('expires previews and prevents history being attached to a newer review version', async () => {
    const f = await fixture()
    const preview = await f.service.prepare(f.input)
    const receipt = await f.service.run(preview)
    const expiring = await f.service.prepare(f.input)
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 11 * 60_000)
    await expect(f.service.run(expiring)).rejects.toThrow('失效')
    vi.useRealTimers()
    const updated = await f.reviews.open({
      ...f.query,
      focus: 'New focus',
      expectedRevision: f.review.revision
    })
    await expect(
      f.service.accept({
        receiptId: receipt.id,
        question: 'evidence',
        expectedRevision: updated.revision
      })
    ).rejects.toThrow('当前审阅版本')
  })
  it('records unknown completion on transport failure and never silently retries', async () => {
    const f = await fixture()
    f.send.mockRejectedValue(new Error('synthetic-credential raw error'))
    const preview = await f.service.prepare(f.input)
    const receipt = await f.service.run(preview)
    expect(receipt.status).toBe('unknown')
    expect(receipt.result).toBeNull()
    expect(JSON.stringify(receipt)).not.toContain('synthetic-credential')
    await f.service.run(preview)
    expect(f.send).toHaveBeenCalledOnce()
  })
  it('treats persisted in-flight work as unknown after restart and preserves it without resending', async () => {
    const f = await fixture()
    const preview = await f.service.prepare(f.input)
    const pending: JevReceipt = {
      ...f.input,
      id: preview.id,
      inputHash: preview.inputHash,
      questionVersion: 'forflow-review-v1',
      requestedModel: JEV_MODEL,
      createdAt: Date.now(),
      completedAt: null,
      status: 'pending',
      result: null,
      error: null
    }
    f.ledger.put(pending)
    expect((await f.service.run(preview)).status).toBe('unknown')
    expect(f.send).not.toHaveBeenCalled()
  })
})
