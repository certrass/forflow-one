import { redactWorkspaceText } from '../review/workspace-sensitive-signals'
import { createHash, randomUUID } from 'node:crypto'
import {
  JEV_MODEL,
  JEV_QUESTION_VERSION,
  type JevPrepareInput,
  type JevPreview,
  type JevReceipt,
  type JevRequest,
  type JevAuditApi
} from '../../shared/jev-audit-types'
import { codexEvidenceKey } from '../../shared/codex-review-types'
import { isCodexAuditPartial } from '../../shared/codex-audit-coverage'
import type { CodexReviewStore } from '../codex-usage/codex-review-store'
import { readCodexReviewEvidence } from '../codex-usage/codex-review-evidence'
import type { ForflowModelAccountStorage } from './model-account-storage'
import type { JevAuditLedger } from './jev-audit-ledger'
import { buildJevRequest, redactJevText } from './jev-audit-input'
import { JevRequestError, requestJev } from './jev-client'

type Draft = { preview: JevPreview; request: JevRequest }
export class JevAuditService {
  private readonly drafts = new Map<string, Draft>()
  private readonly pending = new Map<string, Promise<JevReceipt>>()
  private preparing = 0
  constructor(
    private readonly reviews: Pick<CodexReviewStore, 'get' | 'mutate'>,
    private readonly accounts: ForflowModelAccountStorage,
    private readonly ledger: JevAuditLedger,
    private readonly send: (url: string, init?: RequestInit) => Promise<Response>,
    private readonly enabled: () => boolean,
    private readonly readEvidence: typeof readCodexReviewEvidence = readCodexReviewEvidence
  ) {}

  private current(input: JevPrepareInput) {
    const review = this.reviews.get(input.reviewId)
    const version = review.versions.at(-1)!
    if (version.id !== input.versionId) {
      throw new Error('审阅版本已变化，请重新预览。')
    }
    const file = version.workspace?.files.find((entry) => entry.evidenceKey === input.evidenceKey)
    if (!file && !this.enabled()) {
      throw new Error('请先启用 Codex 使用情况读取。')
    }
    const row = version.audit.rows.find((entry) => codexEvidenceKey(entry) === input.evidenceKey)
    if (!row && (!file || file.status !== 'read')) {
      throw new Error('此记录不属于当前审阅版本。')
    }
    return { review, version, row, file }
  }

  private async requestFor(input: JevPrepareInput, model: string): Promise<JevRequest> {
    const { review, version, row } = this.current(input)
    if (row?.recordFormat === 'response_message' && !row.messageTextChars) {
      throw new Error('此消息没有可读取的文字正文，暂不能审阅图片或摘要块。')
    }
    const record = await this.readEvidence(review, version.id, input.evidenceKey)
    const result = row?.resultSource
      ? await this.readEvidence(review, version.id, input.evidenceKey, 'result')
      : null
    const redact = version.workspace ? redactWorkspaceText : redactJevText
    return buildJevRequest(model, {
      focus: redact(version.focus),
      claim: redact(input.claim),
      record: redact(record.text),
      result: result ? redact(result.text) : null,
      partial:
        !!version.workspace ||
        record.truncated ||
        !!result?.truncated ||
        isCodexAuditPartial(version.audit)
    })
  }

  async prepare(input: JevPrepareInput): Promise<JevPreview> {
    for (const [id, draft] of this.drafts) {
      if (draft.preview.expiresAt < Date.now()) {
        this.drafts.delete(id)
      }
    }
    if (this.drafts.size + this.preparing >= 20) {
      throw new Error('预览数量已达上限，请等待旧预览过期。')
    }
    this.preparing++
    try {
      const model = this.accounts.account('jev').model ?? JEV_MODEL
      const request = await this.requestFor(input, model)
      this.current(input)
      const body = JSON.stringify(request)
      if (Buffer.byteLength(body) > 24 * 1024) {
        throw new Error('此记录超过 Beta 的 24 KiB 发送上限，请选择较短记录。')
      }
      const preview: JevPreview = {
        ...input,
        claim: request.state.claim,
        id: randomUUID(),
        body,
        inputHash: createHash('sha256').update(body).digest('hex'),
        expiresAt: Date.now() + 10 * 60_000
      }
      this.drafts.set(preview.id, { preview, request })
      return { ...preview }
    } finally {
      this.preparing--
    }
  }

  list(reviewId: string): JevReceipt[] {
    return this.ledger
      .all()
      .filter((entry) => entry.reviewId === reviewId)
      .map((entry) =>
        entry.status === 'pending' && !this.pending.has(entry.id)
          ? {
              ...entry,
              status: 'unknown',
              error: '调用期间客户端已重启；是否完成及用量未知，未自动重试。'
            }
          : entry
      )
  }

  run(input: Parameters<JevAuditApi['run']>[0]): Promise<JevReceipt> {
    const draft = this.drafts.get(input.id)
    if (draft && draft.preview.inputHash !== input.inputHash) {
      return Promise.reject(new Error('预览校验失败。'))
    }
    const existing = this.ledger.all().find((entry) => entry.id === input.id)
    if (existing && existing.inputHash !== input.inputHash) {
      return Promise.reject(new Error('预览校验失败。'))
    }
    const pending = this.pending.get(input.id)
    if (pending) {
      return pending
    }
    if (existing) {
      return Promise.resolve(this.list(existing.reviewId).find((entry) => entry.id === input.id)!)
    }
    const promise = this.perform(input).finally(() => this.pending.delete(input.id))
    this.pending.set(input.id, promise)
    return promise
  }

  private async perform(input: Parameters<JevAuditApi['run']>[0]): Promise<JevReceipt> {
    const draft = this.drafts.get(input.id)
    if (
      !draft ||
      draft.preview.expiresAt < Date.now() ||
      draft.preview.inputHash !== input.inputHash
    ) {
      throw new Error('预览已失效，请重新准备发送内容。')
    }
    const credential = this.accounts.credential('jev')
    if (!credential) {
      throw new Error('请先保存 Jev API Key。')
    }
    if (credential.model !== draft.request.model) {
      throw new Error('模型配置已变化，请重新预览。')
    }
    const current = await this.requestFor(draft.preview, credential.model)
    if (JSON.stringify(current) !== draft.preview.body) {
      throw new Error('发送内容已变化，请重新预览。')
    }
    this.current(draft.preview)
    const latestCredential = this.accounts.credential('jev')
    if (
      !latestCredential ||
      latestCredential.model !== credential.model ||
      latestCredential.apiKey !== credential.apiKey
    ) {
      throw new Error('账户配置已变化，请重新预览。')
    }
    let receipt: JevReceipt = {
      id: input.id,
      reviewId: draft.preview.reviewId,
      versionId: draft.preview.versionId,
      evidenceKey: draft.preview.evidenceKey,
      inputHash: input.inputHash,
      questionVersion: JEV_QUESTION_VERSION,
      requestedModel: credential.model,
      createdAt: Date.now(),
      completedAt: null,
      status: 'pending',
      result: null,
      error: null
    }
    this.ledger.put(receipt)
    this.drafts.delete(input.id)
    try {
      const result = await requestJev(draft.request, credential.apiKey, this.send)
      receipt = { ...receipt, status: 'completed', result, completedAt: Date.now() }
    } catch (error) {
      receipt = {
        ...receipt,
        status: error instanceof JevRequestError ? error.outcome : 'unknown',
        completedAt: Date.now(),
        error: error instanceof JevRequestError ? error.message : '调用未完成，用量未知。'
      }
    }
    this.ledger.put(receipt)
    return receipt
  }

  async accept(input: Parameters<JevAuditApi['accept']>[0]) {
    const receipt = this.ledger.all().find((entry) => entry.id === input.receiptId)
    if (receipt && receipt.questionVersion !== JEV_QUESTION_VERSION) {
      throw new Error('Jev 问题版本已变化，请按当前问题重新检查后采纳。历史结果仍保留。')
    }
    const answer = receipt?.result?.answers[input.question]
    if (
      !receipt ||
      receipt.status !== 'completed' ||
      !answer ||
      !['attention', 'missing', 'conflict', 'unknown'].includes(answer.choice)
    ) {
      throw new Error('此结果没有可采纳的待处理建议。')
    }
    const marker = `[Jev:${receipt.id}:${input.question}]`
    const review = this.reviews.get(receipt.reviewId)
    if (review.issues.some((issue) => issue.detail.includes(marker))) {
      return review
    }
    return this.reviews.mutate({
      id: review.id,
      versionId: receipt.versionId,
      expectedRevision: input.expectedRevision,
      action: {
        type: 'issue',
        evidenceKey: receipt.evidenceKey,
        title:
          answer.choice === 'conflict'
            ? 'Jev：主张与所选记录冲突'
            : answer.choice === 'attention'
              ? 'Jev：所选记录存在待核实异常'
              : 'Jev：所选记录需要补充证据',
        detail: `${marker}\n人工采纳的 Beta 建议。仅针对所选记录，需核对原文。\n问题：${input.question}；结果：${answer.choice}\n模型：${receipt.result!.model}；问题版本：${receipt.questionVersion}\n输入摘要：${receipt.inputHash}\n模型概率未经当前行业数据集校准。`
      }
    })
  }
}
