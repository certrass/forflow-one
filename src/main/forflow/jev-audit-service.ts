import { createHash, randomUUID } from 'node:crypto'
import {
  JEV_MODEL,
  JEV_QUESTION_VERSION,
  JEV_DELIVERY_QUESTION_VERSION,
  jevPrepareSchema,
  type JevPrepareInput,
  type JevPreview,
  type JevReceipt,
  type JevRequest,
  type JevAuditApi,
  type JevLegacyPrepareInput,
  type JevDeliveryPrepareInput
} from '../../shared/jev-audit-types'
import type { CodexReviewStore } from '../codex-usage/codex-review-store'
import { readCodexReviewEvidence } from '../codex-usage/codex-review-evidence'
import type { ForflowModelAccountStorage } from './model-account-storage'
import type { JevAuditLedger } from './jev-audit-ledger'
import { JevRequestError, requestJev } from './jev-client'
import { currentJevReview, readJevAuditRequest } from './jev-audit-request'
import { jevAdoptionSuggestion } from './jev-audit-adoption'
import { hasCurrentJevEvaluator } from '../../shared/jev-delivery-assessment'

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
    return currentJevReview(this.reviews, input, this.enabled)
  }

  private requestFor(input: JevPrepareInput, model: string) {
    const { review, version } = this.current(input)
    return readJevAuditRequest(input, model, review, version, this.readEvidence)
  }

  prepare(input: JevLegacyPrepareInput): Promise<Extract<JevPreview, JevLegacyPrepareInput>>
  prepare(input: JevDeliveryPrepareInput): Promise<Extract<JevPreview, JevDeliveryPrepareInput>>
  prepare(input: JevPrepareInput): Promise<JevPreview>
  async prepare(input: JevPrepareInput): Promise<JevPreview> {
    input = jevPrepareSchema.parse(input)
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
      const { request, basis } = await this.requestFor(input, model)
      this.current(input)
      const body = JSON.stringify(request)
      if (Buffer.byteLength(body) > 24 * 1024) {
        throw new Error('此记录超过 Beta 的 24 KiB 发送上限，请选择较短记录。')
      }
      const identity = {
        id: randomUUID(),
        body,
        inputHash: createHash('sha256').update(body).digest('hex'),
        expiresAt: Date.now() + 10 * 60_000
      }
      if (input.mode === 'delivery' && !basis) {
        throw new Error('质量审阅依据不完整。')
      }
      const preview: JevPreview =
        input.mode === 'delivery'
          ? { ...input, ...identity, basis: basis! }
          : { ...input, ...identity, claim: 'claim' in request.state ? request.state.claim : '' }
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
    if (
      JSON.stringify(current.request) !== draft.preview.body ||
      (draft.preview.mode === 'delivery' &&
        JSON.stringify(current.basis) !== JSON.stringify(draft.preview.basis))
    ) {
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
      evidenceKey:
        draft.preview.mode === 'delivery'
          ? draft.preview.evidenceKeys[0]
          : draft.preview.evidenceKey,
      ...(draft.preview.mode === 'delivery'
        ? {
            mode: 'delivery' as const,
            evidenceKeys: draft.preview.evidenceKeys,
            handoffEvidenceKeys: draft.preview.handoffEvidenceKeys,
            basis: draft.preview.basis
          }
        : { legacyClaim: draft.preview.claim }),
      inputHash: input.inputHash,
      questionVersion:
        draft.preview.mode === 'delivery' ? JEV_DELIVERY_QUESTION_VERSION : JEV_QUESTION_VERSION,
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
    if (
      receipt &&
      receipt.questionVersion !==
        (receipt.mode === 'delivery' ? JEV_DELIVERY_QUESTION_VERSION : JEV_QUESTION_VERSION)
    ) {
      throw new Error('Jev 问题版本已变化，请按当前问题重新检查后采纳。历史结果仍保留。')
    }
    const suggestion = receipt && jevAdoptionSuggestion(receipt, input.question)
    if (!receipt || receipt.status !== 'completed' || !suggestion) {
      throw new Error('此结果没有可采纳的待处理建议。')
    }
    if (!hasCurrentJevEvaluator(receipt)) {
      throw new Error('审计器或模型依据已变化或无法核验，请重新检查后采纳。')
    }
    const marker = `[Jev:${receipt.id}:${input.question}]`
    const review = this.reviews.get(receipt.reviewId)
    if (review.issues.some((issue) => issue.detail.includes(marker))) {
      return review
    }
    await this.assertReceiptCurrent(receipt)
    return this.reviews.mutate({
      id: review.id,
      versionId: receipt.versionId,
      expectedRevision: input.expectedRevision,
      action: {
        type: 'issue',
        evidenceKey: receipt.evidenceKey,
        ...(receipt.mode === 'delivery' ? { evidenceKeys: receipt.evidenceKeys } : {}),
        title: suggestion.title,
        detail: `${marker}\n人工采纳的 Beta 建议。仅针对所选证据，需核对原文；不代表验收通过。\n问题：${input.question}；结果：${suggestion.value}\n模型：${receipt.result!.model}；问题版本：${receipt.questionVersion}\n输入摘要：${receipt.inputHash}${receipt.basis ? `\n审计器版本：${receipt.basis.evaluatorVersion}；问题哈希：${receipt.basis.questionHash}` : ''}\n模型概率未经当前行业数据集校准。`
      }
    })
  }

  private async assertReceiptCurrent(receipt: JevReceipt): Promise<void> {
    const input = jevPrepareSchema.parse(
      receipt.mode === 'delivery'
        ? {
            mode: 'delivery',
            reviewId: receipt.reviewId,
            versionId: receipt.versionId,
            evidenceKeys: receipt.evidenceKeys,
            handoffEvidenceKeys: receipt.handoffEvidenceKeys
          }
        : {
            reviewId: receipt.reviewId,
            versionId: receipt.versionId,
            evidenceKey: receipt.evidenceKey,
            claim: receipt.legacyClaim ?? ''
          }
    )
    const current = await this.requestFor(input, receipt.requestedModel)
    if (
      createHash('sha256').update(JSON.stringify(current.request)).digest('hex') !==
        receipt.inputHash ||
      (receipt.mode === 'delivery' &&
        JSON.stringify(current.basis) !== JSON.stringify(receipt.basis))
    ) {
      throw new Error('历史回执依据不完整或已变化，请重新预览并检查后采纳。')
    }
    this.current(input)
  }
}
