import { randomUUID } from 'node:crypto'
import { readFileSync, statSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import {
  codexReviewSchema,
  codexReviewStatus,
  codexEvidenceKey,
  type CodexReview,
  type CodexReviewSourceQuery,
  type CodexReviewMutation
} from '../../shared/codex-review-types'
import { writeFileAtomically } from '../codex-accounts/fs-utils'
import {
  buildCodexReviewVersion,
  codexReviewId,
  type CodexReviewSource
} from './codex-review-version'
import { getLocalUsageDay } from '../usage/usage-calendar-range'

const ledgerSchema = z.object({
  schemaVersion: z.literal(1),
  reviews: z.array(codexReviewSchema).max(1000)
})
const MAX_BYTES = 32 * 1024 * 1024

export class CodexReviewStore {
  constructor(
    private readonly file: string,
    private readonly readSource: (query: CodexReviewSourceQuery) => Promise<CodexReviewSource>
  ) {}

  private read() {
    try {
      if (statSync(this.file).size > MAX_BYTES) {
        throw new Error('审阅记录已达到本机容量限制')
      }
      return ledgerSchema.parse(JSON.parse(readFileSync(this.file, 'utf8')))
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return ledgerSchema.parse({ schemaVersion: 1, reviews: [] })
      }
      throw error
    }
  }

  private save(ledger: z.infer<typeof ledgerSchema>): void {
    const content = JSON.stringify(ledgerSchema.parse(ledger))
    if (Buffer.byteLength(content) > MAX_BYTES) {
      throw new Error('审阅记录已达到本机容量限制')
    }
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 })
    writeFileAtomically(this.file, content, { mode: 0o600 })
  }

  summaries(scope: CodexReviewSourceQuery['scope'], range: CodexReviewSourceQuery['range']) {
    return Object.fromEntries(
      this.read()
        .reviews.filter((review) => review.scope === scope && review.range === range)
        .map((review) => [
          review.sessionId,
          { id: review.id, status: this.summaryStatus(review), versions: review.versions.length }
        ])
    )
  }

  private summaryStatus(review: CodexReview) {
    const status = codexReviewStatus(review)
    if (status !== 'confirmed') {
      return status
    }
    const version = review.versions.at(-1)
    if (
      !version ||
      (review.range !== 'all' &&
        getLocalUsageDay(new Date(version.createdAt).toISOString()) !==
          getLocalUsageDay(new Date().toISOString()))
    ) {
      return 'reviewing'
    }
    try {
      return version.audit.sources?.every((source) => {
        const stat = statSync(source.path)
        return stat.isFile() && stat.size === source.size && stat.mtimeMs === source.mtimeMs
      })
        ? status
        : 'reviewing'
    } catch {
      return 'reviewing'
    }
  }

  get(id: string): CodexReview {
    const review = this.read().reviews.find((entry) => entry.id === id)
    if (!review) {
      throw new Error('审阅记录不存在')
    }
    return review
  }

  async open(query: CodexReviewSourceQuery): Promise<CodexReview> {
    const id = codexReviewId(query)
    const initial = this.read().reviews.find((entry) => entry.id === id)
    const expectedRevision = query.expectedRevision ?? initial?.revision
    const focus =
      initial && query.expectedRevision === undefined
        ? (initial.versions.at(-1)?.focus ?? query.focus)
        : query.focus
    const source = await this.readSource({ ...query, focus })
    if (source.audit.status !== 'ready' || !source.audit.filesRead) {
      throw new Error('当前范围没有可读取的日志，无法创建审阅版本')
    }
    const version = buildCodexReviewVersion(focus, source)
    const ledger = this.read()
    const review = ledger.reviews.find((entry) => entry.id === id)
    if (review) {
      if (expectedRevision !== review.revision) {
        throw new Error('审阅已在其他窗口更新，请重新打开后重试')
      }
      if (review.versions.at(-1)?.id === version.id) {
        return review
      }
      if (review.versions.length >= 100) {
        throw new Error('此审阅已达到 100 个版本，请保留现有历史')
      }
      review.versions.push(version)
      review.revision++
      this.save(ledger)
      return review
    }
    const created: CodexReview = {
      id,
      sessionId: query.sessionId,
      scope: query.scope,
      range: query.range,
      revision: 0,
      versions: [version],
      issues: [],
      comments: [],
      confirmations: []
    }
    ledger.reviews.push(created)
    this.save(ledger)
    return created
  }

  async mutate(input: CodexReviewMutation): Promise<CodexReview> {
    if (input.action.type === 'confirm') {
      const current = this.get(input.id)
      const version = current.versions.at(-1)
      if (!version) {
        throw new Error('审阅版本不存在')
      }
      const source = await this.readSource({ ...current, focus: version.focus })
      if (buildCodexReviewVersion(version.focus, source).id !== version.id) {
        throw new Error('来源已经变化，请重新读取并比较版本后确认')
      }
    }
    const ledger = this.read()
    const review = ledger.reviews.find((entry) => entry.id === input.id)
    if (!review || review.revision !== input.expectedRevision) {
      throw new Error('审阅已变化，请重新打开后重试')
    }
    const version = review.versions.at(-1)
    if (!version || version.id !== input.versionId) {
      throw new Error('只能修改当前审阅版本')
    }
    const action = input.action
    if (action.type === 'comment') {
      if (action.issueId && !review.issues.some((issue) => issue.id === action.issueId)) {
        throw new Error('评论引用的问题不存在')
      }
      review.comments.push({
        id: randomUUID(),
        versionId: version.id,
        issueId: action.issueId ?? null,
        text: action.text,
        createdAt: Date.now()
      })
    } else if (action.type === 'issue') {
      if (
        action.evidenceKey &&
        !version.audit.rows.some((row) => codexEvidenceKey(row) === action.evidenceKey)
      ) {
        throw new Error('问题引用不属于当前审阅版本')
      }
      review.issues.push({
        id: randomUUID(),
        versionId: version.id,
        evidenceKey: action.evidenceKey ?? null,
        title: action.title,
        detail: action.detail,
        status: 'open',
        createdAt: Date.now(),
        resolution: null,
        resolvedInVersion: null
      })
    } else if (action.type === 'resolve') {
      const issue = review.issues.find((entry) => entry.id === action.issueId)
      if (!issue) {
        throw new Error('问题不存在')
      }
      issue.status = action.status
      issue.resolution = action.reason
      issue.resolvedInVersion = action.status === 'open' ? null : version.id
      review.comments.push({
        id: randomUUID(),
        versionId: version.id,
        issueId: issue.id,
        text: `[${action.status}] ${action.reason}`,
        createdAt: Date.now()
      })
    } else {
      if (version.audit.rows.length === 0) {
        throw new Error('当前片段没有可审阅记录，请先补充来源')
      }
      if (review.issues.some((issue) => issue.status === 'open')) {
        throw new Error('仍有未处理问题，不能确认此版本')
      }
      if (
        version.audit.failedFiles ||
        version.audit.conflictingRecords ||
        version.audit.malformedLines
      ) {
        throw new Error('来源存在读取失败、冲突或损坏，请先补证并重新读取')
      }
      review.confirmations.push({
        versionId: version.id,
        createdAt: Date.now(),
        revision: review.revision + 1
      })
    }
    review.revision++
    this.save(ledger)
    return review
  }
}
