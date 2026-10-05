import { mkdtemp, writeFile, readFile, rm, appendFile, utimes } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  codexAnalyticsQuerySchema,
  codexReviewStatus,
  type CodexReview
} from '../../shared/codex-review-types'
import { compareCodexReviewVersions } from '../../shared/codex-review-comparison'
import { buildCodexAnalytics } from './codex-session-analytics'
import { readCodexUsageAudit } from './codex-usage-audit'
import { CodexReviewStore } from './codex-review-store'
import { readCodexReviewEvidence } from './codex-review-evidence'
import type { CodexUsagePersistedState, CodexUsageSession, CodexUsageDailyAggregate } from './types'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})
const timestamp = new Date().toISOString()
function line(type: string, payload: unknown) {
  return `${JSON.stringify({ timestamp, type, payload })}\n`
}
const meta = (id: string) => line('session_meta', { id, cwd: '/folder' })
const context = (turn = 'turn') =>
  line('turn_context', { cwd: '/folder', model: 'gpt-5', turn_id: turn })
const call = (id = 'same-id', args = 'private arguments') =>
  line('response_item', { type: 'function_call', call_id: id, name: 'exec', arguments: args })
const result = (id = 'same-id') =>
  line('response_item', { type: 'function_call_output', call_id: id, output: 'private result' })
function day(overrides: Partial<CodexUsageDailyAggregate> = {}): CodexUsageDailyAggregate {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return {
    day: date,
    model: 'gpt-5',
    projectKey: '/folder',
    projectLabel: 'Folder',
    repoId: null,
    worktreeId: null,
    eventCount: 1,
    longContextInputTokens: 0,
    longContextCachedInputTokens: 0,
    longContextOutputTokens: 0,
    inputTokens: 100,
    cachedInputTokens: 0,
    outputTokens: 10,
    reasoningOutputTokens: 0,
    totalTokens: 110,
    hasInferredPricing: false,
    ...overrides
  }
}
function session(sessionId: string): CodexUsageSession {
  return {
    sessionId,
    firstTimestamp: timestamp,
    lastTimestamp: timestamp,
    primaryModel: 'gpt-5',
    hasMixedModels: false,
    primaryProjectLabel: 'Folder',
    hasMixedLocations: false,
    primaryWorktreeId: null,
    primaryRepoId: null,
    eventCount: 2,
    longContextInputTokens: 0,
    longContextCachedInputTokens: 0,
    longContextOutputTokens: 0,
    totalInputTokens: 10000,
    totalCachedInputTokens: 0,
    totalOutputTokens: 100,
    totalReasoningOutputTokens: 0,
    totalTokens: 10100,
    hasInferredPricing: false,
    modelBreakdown: [],
    locationModelBreakdown: [],
    locationBreakdown: [
      {
        locationKey: '/folder',
        projectLabel: 'Folder',
        repoId: null,
        worktreeId: null,
        eventCount: 2,
        longContextInputTokens: 0,
        longContextCachedInputTokens: 0,
        longContextOutputTokens: 0,
        inputTokens: 10000,
        cachedInputTokens: 0,
        outputTokens: 100,
        reasoningOutputTokens: 0,
        totalTokens: 10100,
        hasInferredPricing: false
      }
    ]
  }
}
async function fixture(contents = [meta('a') + context() + call()]) {
  const dir = await mkdtemp(join(tmpdir(), 'codex-review-'))
  dirs.push(dir)
  const sessions = contents.map((_, i) => session(String.fromCharCode(97 + i)))
  const processedFiles = await Promise.all(
    contents.map(async (text, i) => {
      const path = join(dir, `${i}.jsonl`)
      await writeFile(path, text)
      return {
        path,
        mtimeMs: i,
        size: Buffer.byteLength(text),
        sessions: [sessions[i]],
        dailyAggregates: [day()],
        ownedEventKeys: [],
        hasDeferredClaims: false
      }
    })
  )
  const state: CodexUsagePersistedState = {
    schemaVersion: 5,
    worktreeFingerprint: null,
    processedFiles,
    sessions,
    dailyAggregates: [],
    scanState: { enabled: true, lastScanStartedAt: 1, lastScanCompletedAt: 2, lastScanError: null }
  }
  const query = {
    sessionId: 'a',
    scope: 'all' as const,
    range: 'all' as const,
    focus: 'Inspect evidence'
  }
  const ledger = join(dir, 'reviews.json')
  const readSource = async () => {
    const analytics = await buildCodexAnalytics(
      state,
      codexAnalyticsQuerySchema.parse({ scope: 'all', range: 'all' })
    )
    return {
      usage: analytics.rows.find((row) => row.sessionId === 'a')!,
      audit: await readCodexUsageAudit(state, 'all', 'all', () => null, {
        sessionId: 'a',
        rowLimit: 200
      })
    }
  }
  const store = new CodexReviewStore(ledger, readSource)
  const mutate = (review: CodexReview, action: Parameters<typeof store.mutate>[0]['action']) =>
    store.mutate({
      id: review.id,
      expectedRevision: review.revision,
      versionId: review.versions.at(-1)!.id,
      action
    })
  return { state, dir, ledger, query, store, readSource, mutate, path: processedFiles[0].path }
}

describe('Codex session analytics', () => {
  it('uses period-attributed tokens instead of the session lifetime total', async () => {
    const { state } = await fixture()
    state.processedFiles[0].dailyAggregates.push(day({ day: '2000-01-01', totalTokens: 9000 }))
    const current = await buildCodexAnalytics(
      state,
      codexAnalyticsQuerySchema.parse({ scope: 'all', range: '7d' })
    )
    const all = await buildCodexAnalytics(
      state,
      codexAnalyticsQuerySchema.parse({ scope: 'all', range: 'all' })
    )
    expect(current.rows[0].totalTokens).toBe(110)
    expect(all.rows[0].totalTokens).toBe(9110)
    expect(current.rows[0].estimatedCostUsd).toBeGreaterThan(0)
  })
  it('sorts, searches and paginates all sessions, keeping unknown prices null', async () => {
    const { state } = await fixture([meta('a'), meta('b'), meta('c')])
    state.processedFiles[1].dailyAggregates = [day({ totalTokens: 220, inputTokens: 200 })]
    state.processedFiles[2].dailyAggregates = [
      day({ model: 'unpriced-private', totalTokens: 1000 })
    ]
    const query = codexAnalyticsQuerySchema.parse({
      scope: 'all',
      range: 'all',
      order: 'tokens',
      pageSize: 1
    })
    const top = await buildCodexAnalytics(state, query)
    expect(top).toMatchObject({ total: 3, page: 1 })
    expect(top.rows[0]).toMatchObject({ sessionId: 'c', estimatedCostUsd: null, unpricedEvents: 1 })
    expect((await buildCodexAnalytics(state, { ...query, page: 2 })).rows[0].sessionId).toBe('b')
    expect((await buildCodexAnalytics(state, { ...query, order: 'cost' })).rows[0].sessionId).toBe(
      'b'
    )
    expect((await buildCodexAnalytics(state, { ...query, search: 'unpriced' })).total).toBe(1)
    expect((await buildCodexAnalytics(state, { ...query, project: 'Missing' })).total).toBe(0)
  })
  it('does not invent period attribution for a legacy multi-session file or include folders in worktree scope', async () => {
    const { state } = await fixture()
    state.processedFiles[0].sessions.push(session('b'))
    const query = codexAnalyticsQuerySchema.parse({ scope: 'all', range: 'all' })
    expect((await buildCodexAnalytics(state, query)).rows[0]).toMatchObject({
      totalTokens: null,
      estimatedCostUsd: null,
      coverage: 'unavailable'
    })
    expect((await buildCodexAnalytics(state, { ...query, scope: 'orca' })).total).toBe(0)
  })
})

describe('scoped audit identities', () => {
  it('never pairs calls and results across sessions or turns', async () => {
    const { state } = await fixture([
      meta('a') + context() + call(),
      meta('b') + context() + result()
    ])
    const audit = await readCodexUsageAudit(state, 'all', 'all', () => null)
    expect(audit.toolResults).toBe(0)
    await appendFile(state.processedFiles[0].path, context('next-turn') + result())
    const next = await readCodexUsageAudit(state, 'all', 'all', () => null, { sessionId: 'a' })
    expect(next.toolResults).toBe(0)
    expect(next.rows.every((row) => row.sessionId === 'a')).toBe(true)
  })
  it('detects conflicting same-scope IDs while preserving exact duplicate deduplication', async () => {
    const { state } = await fixture([
      meta('a') + context() + call() + call() + call('same-id', 'changed')
    ])
    const audit = await readCodexUsageAudit(state, 'all', 'all', () => null)
    expect(audit.counts.tool).toBe(1)
    expect(audit.conflictingRecords).toBe(1)
  })
  it('does not trust cached session identity after a source is replaced', async () => {
    const { state, path } = await fixture()
    await writeFile(
      path,
      meta('another-session') +
        line('unknown', { body: 'x'.repeat(3 * 1024 * 1024) }) +
        context() +
        call()
    )
    const audit = await readCodexUsageAudit(state, 'all', 'all', () => null, { sessionId: 'a' })
    expect(audit.truncatedFiles).toBe(1)
    expect(audit.counts.tool).toBe(0)
  })
})

describe('durable, versioned session review', () => {
  it('opens the indexed source and keeps the search path out of the saved review identity', async () => {
    const { store, query, path } = await fixture()
    const fromSearch = await store.open({ ...query, expectedSourcePath: path })
    expect(await store.open(query)).toEqual(fromSearch)
    expect(fromSearch.versions[0].audit.sources?.some((source) => source.path === path)).toBe(true)
    expect(fromSearch).not.toHaveProperty('expectedSourcePath')
  })

  it('refuses a search source mismatch before creating or updating a ledger', async () => {
    const { store, query, ledger, dir } = await fixture()
    const expectedSourcePath = join(dir, 'another-home', 'same-session.jsonl')
    await expect(store.open({ ...query, expectedSourcePath })).rejects.toThrow('搜索命中的来源')
    await expect(readFile(ledger)).rejects.toMatchObject({ code: 'ENOENT' })
    await store.open(query)
    const original = await readFile(ledger, 'utf8')
    await expect(store.open({ ...query, expectedSourcePath })).rejects.toThrow('搜索命中的来源')
    expect(await readFile(ledger, 'utf8')).toBe(original)
  })

  it('persists comments and anchored issues across reopening without changing source logs', async () => {
    const f = await fixture()
    const sourceBefore = await readFile(f.path, 'utf8')
    let review = await f.store.open(f.query)
    const key = review.versions[0].audit.rows.find((row) => row.kind === 'tool')!.evidenceKey!
    review = await f.mutate(review, {
      type: 'issue',
      title: 'Return not visible',
      detail: 'Check evidence',
      evidenceKey: key
    })
    review = await f.mutate(review, { type: 'comment', text: 'Local discussion' })
    const reopened = await new CodexReviewStore(f.ledger, f.readSource).open(f.query)
    expect(reopened).toEqual(review)
    expect(await readFile(f.path, 'utf8')).toBe(sourceBefore)
    expect(await readFile(f.ledger, 'utf8')).not.toContain('private arguments')
    expect(codexReviewStatus(review)).toBe('issues')
  })
  it('rejects stale revisions, unknown anchors and confirmation with an open issue', async () => {
    const f = await fixture()
    const initial = await f.store.open(f.query)
    await expect(
      f.mutate(initial, { type: 'issue', title: 'Bad', detail: '', evidenceKey: 'missing' })
    ).rejects.toThrow('引用')
    const changed = await f.mutate(initial, { type: 'issue', title: 'Check', detail: '' })
    await expect(f.mutate(initial, { type: 'comment', text: 'stale' })).rejects.toThrow('变化')
    await expect(f.mutate(changed, { type: 'confirm' })).rejects.toThrow('未处理')
  })
  it('invalidates a confirmation when source changes, carries decisions forward, and compares the returned record', async () => {
    const f = await fixture()
    let review = await f.store.open(f.query)
    review = await f.mutate(review, { type: 'issue', title: 'Return missing', detail: '' })
    review = await f.mutate(review, {
      type: 'resolve',
      issueId: review.issues[0].id,
      status: 'dismissed',
      reason: 'Partial source is explicitly scoped'
    })
    review = await f.mutate(review, { type: 'confirm' })
    expect(codexReviewStatus(review)).toBe('confirmed')
    expect(f.store.summaries('all', 'all').a.status).toBe('confirmed')
    await appendFile(f.path, result())
    expect(f.store.summaries('all', 'all').a.status).toBe('reviewing')
    await expect(f.mutate(review, { type: 'confirm' })).rejects.toThrow('来源已经变化')
    const next = await f.store.open(f.query)
    expect(next.versions).toHaveLength(2)
    expect(next.issues[0].status).toBe('dismissed')
    expect(codexReviewStatus(next)).toBe('reviewing')
    expect(compareCodexReviewVersions(next.versions[0], next.versions[1]).changed).toHaveLength(1)
    expect((await f.store.open(f.query)).versions).toHaveLength(2)
  })
  it('preserves open issues when their evidence disappears from a newer version', async () => {
    const f = await fixture()
    let review = await f.store.open(f.query)
    review = await f.mutate(review, {
      type: 'issue',
      title: 'Follow up',
      detail: '',
      evidenceKey: review.versions[0].audit.rows.find((row) => row.kind === 'tool')!.evidenceKey
    })
    await writeFile(f.path, meta('a') + context())
    const next = await f.store.open(f.query)
    expect(compareCodexReviewVersions(next.versions[0], next.versions[1]).removed).toHaveLength(1)
    expect(next.issues[0].status).toBe('open')
    await expect(f.mutate(next, { type: 'confirm' })).rejects.toThrow('未处理')
  })
  it.each(['record', 'return', 'removed'] as const)(
    'reopens a closed record issue when its %s evidence changes',
    async (change) => {
      const f = await fixture([meta('a') + context() + call() + result()])
      let review = await f.store.open(f.query)
      const key = review.versions[0].audit.rows.find((row) => row.kind === 'tool')!.evidenceKey!
      review = await f.mutate(review, {
        type: 'issue',
        title: 'Check return',
        detail: 'The decision depends on this call and its return.',
        evidenceKey: key
      })
      review = await f.mutate(review, {
        type: 'resolve',
        issueId: review.issues[0].id,
        status: 'resolved',
        reason: 'Verified the saved return'
      })
      const closingComment = review.comments.at(-1)!
      review = await f.mutate(review, { type: 'confirm' })
      const changed =
        change === 'record'
          ? call('same-id', 'changed arguments') + result()
          : change === 'return'
            ? call() +
              line('response_item', {
                type: 'function_call_output',
                call_id: 'same-id',
                output: 'Exit code 1'
              })
            : ''
      await writeFile(f.path, meta('a') + context() + changed)
      const next = await f.store.open(f.query)
      expect(next.issues[0]).toMatchObject({ status: 'open', resolvedInVersion: null })
      expect(next.comments).toContainEqual(closingComment)
      expect(
        next.comments.some(
          (comment) =>
            comment.issueId === review.issues[0].id &&
            comment.versionId === next.versions.at(-1)!.id
        )
      ).toBe(true)
      expect(next.confirmations).toEqual(review.confirmations)
      expect(codexReviewStatus(next)).toBe('issues')
      await expect(f.mutate(next, { type: 'confirm' })).rejects.toThrow('未处理')
      const reviewed = await f.mutate(next, {
        type: 'resolve',
        issueId: next.issues[0].id,
        status: 'dismissed',
        reason: 'Rechecked the changed evidence and current scope'
      })
      expect(codexReviewStatus(await f.mutate(reviewed, { type: 'confirm' }))).toBe('confirmed')
    }
  )
  it('keeps a closed record decision when only unrelated evidence or file timestamps change', async () => {
    const f = await fixture([meta('a') + context() + call() + result()])
    let review = await f.store.open(f.query)
    review = await f.mutate(review, {
      type: 'issue',
      title: 'Check this return',
      detail: '',
      evidenceKey: review.versions[0].audit.rows.find((row) => row.kind === 'tool')!.evidenceKey!
    })
    review = await f.mutate(review, {
      type: 'resolve',
      issueId: review.issues[0].id,
      status: 'dismissed',
      reason: 'This call has a verified return'
    })
    const decision = review.issues[0]
    await appendFile(f.path, call('another-call') + result('another-call'))
    let next = await f.store.open(f.query)
    expect(next.issues[0]).toEqual(decision)
    await utimes(f.path, new Date(), new Date(Date.now() + 10_000))
    next = await f.store.open(f.query)
    expect(next.issues[0]).toEqual(decision)
    expect(codexReviewStatus(await f.mutate(next, { type: 'confirm' }))).toBe('confirmed')
  })
  it('blocks direct confirmation of a historical carried-forward decision and repairs it on reread', async () => {
    const f = await fixture()
    let review = await f.store.open(f.query)
    review = await f.mutate(review, {
      type: 'issue',
      title: 'Check arguments',
      detail: '',
      evidenceKey: review.versions[0].audit.rows.find((row) => row.kind === 'tool')!.evidenceKey!
    })
    review = await f.mutate(review, {
      type: 'resolve',
      issueId: review.issues[0].id,
      status: 'dismissed',
      reason: 'The original arguments were expected'
    })
    const oldDecision = structuredClone(review.issues[0])
    const oldComments = structuredClone(review.comments)
    await writeFile(f.path, meta('a') + context() + call('same-id', 'changed arguments'))
    const legacy = await f.store.open(f.query)
    legacy.issues[0] = oldDecision
    legacy.comments = oldComments
    await writeFile(f.ledger, JSON.stringify({ schemaVersion: 1, reviews: [legacy] }))
    await expect(f.mutate(f.store.get(legacy.id), { type: 'confirm' })).rejects.toThrow(
      '问题处理依据已变化'
    )
    expect(f.store.get(legacy.id)).toEqual(legacy)
    const reopened = await f.store.open(f.query)
    expect(reopened.versions).toEqual(legacy.versions)
    expect(reopened.revision).toBe(legacy.revision + 1)
    expect(reopened.issues[0]).toMatchObject({ status: 'open', resolvedInVersion: null })
    expect(reopened.comments).toEqual(expect.arrayContaining(oldComments))
    await expect(f.mutate(reopened, { type: 'confirm' })).rejects.toThrow('未处理')
    expect(await f.store.open(f.query)).toEqual(reopened)
    const reviewed = await f.mutate(reopened, {
      type: 'resolve',
      issueId: reopened.issues[0].id,
      status: 'resolved',
      reason: 'Verified the changed arguments after rereading'
    })
    expect(codexReviewStatus(await f.mutate(reviewed, { type: 'confirm' }))).toBe('confirmed')
  })
  it('requires reassessment when the historical record has no verifiable content hash', async () => {
    const f = await fixture()
    let review = await f.store.open(f.query)
    const row = review.versions[0].audit.rows.find((entry) => entry.kind === 'tool')!
    review = await f.mutate(review, {
      type: 'issue',
      title: 'Legacy evidence decision',
      detail: '',
      evidenceKey: row.evidenceKey!
    })
    review = await f.mutate(review, {
      type: 'resolve',
      issueId: review.issues[0].id,
      status: 'resolved',
      reason: 'Closed by a previous application version'
    })
    delete review.versions[0].audit.rows.find((entry) => entry.kind === 'tool')!.contentHash
    await writeFile(f.ledger, JSON.stringify({ schemaVersion: 1, reviews: [review] }))
    await appendFile(f.path, call('unrelated-call'))
    const next = await f.store.open(f.query)
    expect(next.issues[0]).toMatchObject({ status: 'open', resolvedInVersion: null })
    expect(next.comments).toEqual(expect.arrayContaining(review.comments))
    await expect(f.mutate(next, { type: 'confirm' })).rejects.toThrow('未处理')
  })
  it('refuses confirmation when records conflict or are damaged', async () => {
    const f = await fixture([
      `${meta('a') + context() + call() + call('same-id', 'different')}{bad}\n`
    ])
    const review = await f.store.open(f.query)
    await expect(f.mutate(review, { type: 'confirm' })).rejects.toThrow('损坏')
  })
  it('does not overwrite a corrupt ledger or claim success on failed persistence', async () => {
    const f = await fixture()
    await writeFile(f.ledger, '{broken}')
    await expect(f.store.open(f.query)).rejects.toThrow()
    expect(await readFile(f.ledger, 'utf8')).toBe('{broken}')
    const bad = new CodexReviewStore(join(f.path, 'impossible.json'), f.readSource)
    await expect(bad.open(f.query)).rejects.toThrow()
  })
  it('serializes competing asynchronous rereads through revisions without losing an update', async () => {
    const f = await fixture()
    const review = await f.store.open(f.query)
    await appendFile(f.path, result())
    const outcomes = await Promise.allSettled([
      f.store.open({ ...f.query, expectedRevision: review.revision }),
      f.store.open({ ...f.query, expectedRevision: review.revision })
    ])
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    expect(f.store.get(review.id).versions).toHaveLength(2)
  })
})

describe('local evidence excerpts', () => {
  it('verifies the saved source hash, masks common credentials, and rejects arbitrary anchors', async () => {
    const f = await fixture([
      meta('a') + context() + call('same-id', 'Bearer abc123-private-token owner@example.com')
    ])
    const review = await f.store.open(f.query)
    const version = review.versions[0]
    const key = version.audit.rows.find((row) => row.kind === 'tool')!.evidenceKey!
    const excerpt = await readCodexReviewEvidence(review, version.id, key)
    expect(excerpt.text).toContain('[redacted]')
    expect(excerpt.text).not.toMatch(/abc123-private-token|owner@example.com/)
    await expect(readCodexReviewEvidence(review, version.id, 'arbitrary')).rejects.toThrow('位置')
    await writeFile(f.path, meta('a') + context() + call('same-id', 'changed source'))
    await expect(readCodexReviewEvidence(review, version.id, key)).rejects.toThrow('已变化')
  })
  it('reads the matched return body only from the saved source window', async () => {
    const f = await fixture([meta('a') + context() + call() + result()])
    const review = await f.store.open(f.query)
    const version = review.versions[0]
    const row = version.audit.rows.find((entry) => entry.kind === 'tool')!
    expect(row.resultSource).toBeDefined()
    const excerpt = await readCodexReviewEvidence(review, version.id, row.evidenceKey!, 'result')
    expect(excerpt.text).toContain('private result')
    expect(excerpt.text).not.toContain('private arguments')
    expect(JSON.stringify(review)).not.toContain('private result')
  })
  it('reads an intact historical prefix after appending, without treating appended bytes as old evidence', async () => {
    const f = await fixture()
    const review = await f.store.open(f.query)
    const version = review.versions[0]
    await appendFile(f.path, result())
    const excerpt = await readCodexReviewEvidence(
      review,
      version.id,
      version.audit.rows.find((row) => row.kind === 'tool')!.evidenceKey!
    )
    expect(excerpt.text).toContain('function_call')
    expect(excerpt.text).not.toContain('private result')
  })
})
