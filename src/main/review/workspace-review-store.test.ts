import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  codexReviewStatus,
  type CodexReview,
  type CodexReviewMutation
} from '../../shared/codex-review-types'
import type {
  WorkspaceReviewQuery,
  WorkspaceReviewTarget
} from '../../shared/workspace-review-types'
import { CodexReviewStore } from '../codex-usage/codex-review-store'
import type { CodexUsageStore } from '../codex-usage/store'
import { WorkspaceReviewSource } from './workspace-review-source'
import { readWorkspaceReviewInput } from './workspace-review-input'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

function conversationSource(
  sessionId = 'conversation-1'
): Awaited<ReturnType<CodexUsageStore['getReviewSource']>> {
  return {
    usage: {
      sessionId,
      title: '会话',
      projectLabels: ['同名项目'],
      models: [],
      lastActiveAt: '2026-09-21T00:00:00Z',
      totalTokens: null,
      inputTokens: null,
      outputTokens: null,
      cachedInputTokens: null,
      events: null,
      estimatedCostUsd: null,
      unpricedEvents: 0,
      sourceFiles: 1,
      coverage: 'unavailable'
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
      toolResults: 0,
      counts: { context: 1, request: 0, tool: 0, data: 0 },
      rows: [
        {
          kind: 'context',
          timestamp: '2026-09-21T00:00:00Z',
          sourcePath: '/logs/conversation.jsonl',
          byteOffset: 0,
          sessionId,
          name: 'assistant message',
          recordId: null,
          tokens: null,
          hasResult: null,
          contentHash: 'a'.repeat(64),
          messageRole: 'assistant',
          recordFormat: 'response_message'
        }
      ],
      sources: [
        { path: '/logs/conversation.jsonl', start: 0, end: 10, size: 10, sha256: 'a'.repeat(64) }
      ],
      conflictingRecords: 0,
      messageCounts: { user: 0, assistant: 1 },
      omittedRows: 0,
      incompleteLines: 0,
      unreadSources: []
    }
  }
}

async function fixture() {
  const temp = await mkdtemp(join(tmpdir(), 'workspace-review-store-'))
  roots.push(temp)
  const rootPath = join(temp, 'workspace')
  await mkdir(rootPath)
  await writeFile(join(rootPath, 'code.ts'), 'export const result = 1\n')
  const target: WorkspaceReviewTarget = {
    id: 'stable-workspace',
    selector: 'folder:workspace',
    kind: 'folder',
    hostId: 'local',
    name: '同名项目',
    rootPath,
    projectId: null,
    available: true,
    unavailableReason: null
  }
  const workspaceSource = new WorkspaceReviewSource({
    resolveTarget: async () => target,
    authorizePath: realpath,
    readGitMetadata: async () => ({
      status: 'not_applicable',
      head: null,
      branch: null,
      changes: [],
      reason: null
    })
  })
  const usage = {
    getReviewSource: vi.fn<CodexUsageStore['getReviewSource']>(async (query) =>
      conversationSource(query.sessionId)
    )
  }
  const query: WorkspaceReviewQuery = {
    workspaceId: target.id,
    focus: '审阅已选研发材料',
    selection: {
      files: [{ path: 'code.ts', kind: 'code' }],
      sessionIds: [],
      policyReference: '',
      applicability: 'unconfirmed',
      applicabilityReason: ''
    }
  }
  const source = (input: WorkspaceReviewQuery) =>
    readWorkspaceReviewInput(input, workspaceSource, usage)
  const ledger = join(temp, 'workspace-reviews.json')
  const store = new CodexReviewStore(ledger, (input) => {
    if (!('workspaceId' in input)) {
      throw new Error('workspace ledger only')
    }
    return source(input)
  })
  return { temp, rootPath, target, query, workspaceSource, usage, source, ledger, store }
}

function mutate(
  store: CodexReviewStore,
  review: CodexReview,
  action: CodexReviewMutation['action']
) {
  return store.mutate({
    id: review.id,
    expectedRevision: review.revision,
    versionId: review.versions.at(-1)!.id,
    action
  })
}

describe('workspace Review store and linked inputs', () => {
  it('creates and persists a file-backed review without inventing a session or usage', async () => {
    const f = await fixture()
    const review = await f.store.open(f.query)
    expect(review.sessionId).toBeNull()
    expect(review.versions[0]?.usage).toBeNull()
    expect(review.versions[0]?.workspace?.target.id).toBe(f.target.id)
    expect(review.versions[0]?.audit.rows).toEqual([])
    expect(f.usage.getReviewSource).not.toHaveBeenCalled()
    const persisted = JSON.parse(await readFile(f.ledger, 'utf8'))
    expect(persisted.reviews[0].sessionId).toBeNull()
    expect(f.store.summaries('all', 'all')).toEqual({})
  })

  it('keeps the same version on unchanged read and clears current confirmation after a file change', async () => {
    const f = await fixture()
    const initial = await f.store.open(f.query)
    const confirmed = await mutate(f.store, initial, { type: 'confirm' })
    expect(codexReviewStatus(confirmed)).toBe('confirmed')
    const unchanged = await f.store.open(f.query)
    expect(unchanged.versions).toHaveLength(1)
    expect(codexReviewStatus(unchanged)).toBe('confirmed')
    await writeFile(join(f.rootPath, 'code.ts'), 'export const result = 2\n')
    const changed = await f.store.open(f.query)
    expect(changed.id).toBe(initial.id)
    expect(changed.versions).toHaveLength(2)
    expect(changed.versions[0]?.id).toBe(initial.versions[0]?.id)
    expect(codexReviewStatus(changed)).toBe('reviewing')
    expect(changed.confirmations).toHaveLength(1)
  })

  it('re-reads sources before confirming and refuses an unseen file change', async () => {
    const f = await fixture()
    const review = await f.store.open(f.query)
    await writeFile(join(f.rootPath, 'code.ts'), 'changed after review')
    await expect(mutate(f.store, review, { type: 'confirm' })).rejects.toThrow('来源已经变化')
    expect(f.store.get(review.id).confirmations).toEqual([])
  })

  it('retains missing selections and prevents confirmation until their source is available', async () => {
    const f = await fixture()
    f.query.selection.files.push({ path: 'missing.md', kind: 'document' })
    const review = await f.store.open(f.query)
    expect(review.versions[0]?.workspace?.files[1]?.status).toBe('missing')
    await expect(mutate(f.store, review, { type: 'confirm' })).rejects.toThrow('读取失败')
    await writeFile(join(f.rootPath, 'missing.md'), '补入原文')
    const reread = await f.store.open(f.query)
    expect(codexReviewStatus(await mutate(f.store, reread, { type: 'confirm' }))).toBe('confirmed')
  })

  it('accepts a selected file issue and rejects an unrelated evidence key', async () => {
    const f = await fixture()
    const review = await f.store.open(f.query)
    await expect(
      mutate(f.store, review, {
        type: 'issue',
        title: '无关引用',
        detail: '',
        evidenceKey: 'unknown'
      })
    ).rejects.toThrow('不属于当前审阅版本')
    const key = review.versions[0]!.workspace!.files[0]!.evidenceKey
    const updated = await mutate(f.store, review, {
      type: 'issue',
      title: '需要复核',
      detail: '对应当前文件原文',
      evidenceKey: key
    })
    expect(updated.issues[0]?.evidenceKey).toBe(key)
    await expect(mutate(f.store, updated, { type: 'confirm' })).rejects.toThrow('仍有未处理问题')
  })

  it('persists comments across a fresh store instance and refuses stale revisions', async () => {
    const f = await fixture()
    const review = await f.store.open(f.query)
    const updated = await mutate(f.store, review, { type: 'comment', text: '等待验证当前改动' })
    const reloaded = new CodexReviewStore(f.ledger, async () => {
      throw new Error('no source read expected')
    })
    expect(reloaded.get(review.id).comments[0]?.text).toBe('等待验证当前改动')
    expect(reloaded.get(review.id).revision).toBe(updated.revision)
    await expect(mutate(f.store, review, { type: 'comment', text: '过期写入' })).rejects.toThrow(
      '审阅已变化'
    )
  })

  it('records failed linked sessions as coverage gaps and blocks confirmation', async () => {
    const f = await fixture()
    f.query.selection.sessionIds = ['deleted-session']
    f.usage.getReviewSource.mockRejectedValueOnce(new Error('missing session'))
    const review = await f.store.open(f.query)
    expect(review.versions[0]?.audit.failedFiles).toBe(1)
    expect(
      review.versions[0]?.workspace?.gaps.some(
        (gap) => gap.includes('deleted-session') && gap.includes('读取失败')
      )
    ).toBe(true)
    f.usage.getReviewSource.mockRejectedValueOnce(new Error('missing session'))
    await expect(mutate(f.store, review, { type: 'confirm' })).rejects.toThrow('读取失败')
  })

  it('deduplicates explicitly selected sessions and their source rows', async () => {
    const f = await fixture()
    f.query.selection.sessionIds = ['conversation-1', 'conversation-1']
    const source = await f.source(f.query)
    expect(f.usage.getReviewSource).toHaveBeenCalledTimes(1)
    expect(source.audit.rows).toHaveLength(1)
    expect(source.audit.messageCounts).toEqual({ user: 0, assistant: 1 })
    expect(source.audit.filesRead).toBe(1)
    expect(source.usage).toBeNull()
  })

  it('keeps disabled linked reading unknown instead of turning empty logs into coverage', async () => {
    const f = await fixture()
    f.query.selection.sessionIds = ['disabled-session']
    const disabled = conversationSource('disabled-session')
    disabled.audit = { ...disabled.audit, status: 'disabled', filesRead: 0, rows: [], sources: [] }
    f.usage.getReviewSource.mockResolvedValueOnce(disabled)
    const source = await f.source(f.query)
    expect(source.audit.failedFiles).toBe(1)
    expect(source.audit.filesRead).toBe(0)
    expect(source.workspace?.gaps.some((gap) => gap.includes('没有可读取的日志'))).toBe(true)
  })

  it('keeps conversation and workspace ledgers separate even when the visible names match', async () => {
    const f = await fixture()
    const conversationLedger = join(f.temp, 'session-reviews.json')
    const sessions = new CodexReviewStore(conversationLedger, async (input) => {
      if (!('sessionId' in input)) {
        throw new Error('conversation ledger only')
      }
      return conversationSource(input.sessionId)
    })
    const conversation = await sessions.open({
      sessionId: f.target.id,
      scope: 'all',
      range: 'all',
      focus: '会话原文'
    })
    const workspace = await f.store.open(f.query)
    expect(conversation.id).not.toBe(workspace.id)
    expect(sessions.has(workspace.id)).toBe(false)
    expect(f.store.has(conversation.id)).toBe(false)
    expect(sessions.list().map((review) => review.sessionId)).toEqual([f.target.id])
    expect(f.store.list().map((review) => review.sessionId)).toEqual([null])
    await mutate(f.store, workspace, { type: 'comment', text: '仅属于项目' })
    expect(sessions.get(conversation.id).comments).toEqual([])
  })
})
