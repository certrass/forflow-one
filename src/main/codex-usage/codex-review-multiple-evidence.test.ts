import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, expect, it } from 'vitest'
import type { CodexReview, CodexReviewMutation } from '../../shared/codex-review-types'
import { CodexReviewStore } from './codex-review-store'
import type { CodexReviewSource } from './codex-review-version'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'review-multiple-evidence-'))
  roots.push(root)
  const source: CodexReviewSource = {
    usage: null,
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
      toolResults: 0,
      counts: { context: 0, request: 0, tool: 2, data: 0 },
      rows: ['first', 'second'].map((key, index) => ({
        kind: 'tool',
        timestamp: '2026-09-22T00:00:00Z',
        sourcePath: '/synthetic/log.jsonl',
        byteOffset: index * 100,
        sessionId: 'synthetic',
        name: 'exec',
        recordId: key,
        tokens: null,
        hasResult: false,
        evidenceKey: key,
        contentHash: String(index + 1).repeat(64)
      }))
    }
  }
  const store = new CodexReviewStore(join(root, 'reviews.json'), async () =>
    structuredClone(source)
  )
  const query = {
    sessionId: 'synthetic',
    scope: 'all' as const,
    range: 'all' as const,
    focus: '重启后问题仍保存'
  }
  const mutate = (review: CodexReview, action: CodexReviewMutation['action']) =>
    store.mutate({
      id: review.id,
      versionId: review.versions.at(-1)!.id,
      expectedRevision: review.revision,
      action
    })
  let review = await store.open(query)
  review = await mutate(review, {
    type: 'issue',
    title: '补充复验',
    detail: '人工采纳的多来源检查',
    evidenceKeys: ['first', 'second', 'first']
  })
  review = await mutate(review, {
    type: 'resolve',
    issueId: review.issues[0].id,
    status: 'dismissed',
    reason: '已核对当前两份材料'
  })
  return { store, source, query, mutate, review }
}

it.each(['changed', 'removed'] as const)(
  'reopens when the second input is %s, retaining the prior decision',
  async (change) => {
    const f = await fixture()
    expect(f.review.issues[0]).toMatchObject({
      evidenceKey: 'first',
      evidenceKeys: ['first', 'second']
    })
    if (change === 'changed') {
      f.source.audit.rows[1].contentHash = 'f'.repeat(64)
    } else {
      f.source.audit.rows.pop()
    }
    const updated = await f.store.open(f.query)
    expect(updated.issues[0].status).toBe('open')
    expect(updated.comments.some((entry) => entry.text.includes('已核对当前两份材料'))).toBe(true)
    await expect(f.mutate(updated, { type: 'confirm' })).rejects.toThrow('未处理')
  }
)

it('reopens a multiple-evidence decision after its requirement changes', async () => {
  const f = await fixture()
  const unchanged = await f.store.open(f.query)
  expect(unchanged.issues[0].status).toBe('dismissed')
  const updated = await f.store.open({
    ...f.query,
    focus: '多设备重启后问题仍保存',
    expectedRevision: unchanged.revision
  })
  expect(updated.issues[0].status).toBe('open')
  expect(updated.versions).toHaveLength(2)
})

it('rejects any unknown input anchor without changing the ledger', async () => {
  const f = await fixture()
  await expect(
    f.mutate(f.review, {
      type: 'issue',
      title: '无效来源',
      detail: '',
      evidenceKey: 'first',
      evidenceKeys: ['second', 'unknown']
    })
  ).rejects.toThrow('引用')
  expect(f.store.get(f.review.id)).toEqual(f.review)
})
