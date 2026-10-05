import { createHash } from 'node:crypto'
import {
  JEV_DELIVERY_EVALUATOR_VERSION,
  JEV_DELIVERY_EVALUATION_SUITE_HASH,
  type JevPrepareInput,
  type JevRequest,
  type JevDeliveryBasis
} from '../../shared/jev-audit-types'
import {
  codexEvidenceKey,
  type CodexReview,
  type CodexReviewVersion
} from '../../shared/codex-review-types'
import { isCodexAuditPartial } from '../../shared/codex-audit-coverage'
import type { CodexReviewStore } from '../codex-usage/codex-review-store'
import type { readCodexReviewEvidence } from '../codex-usage/codex-review-evidence'
import { redactWorkspaceText } from '../review/workspace-sensitive-signals'
import { buildJevRequest, redactJevText } from './jev-audit-input'
import { readJevDeliveryState } from './jev-delivery-input'
import { jevDeliveryQuestions } from '../../shared/jev-delivery-questions'

export function currentJevReview(
  reviews: Pick<CodexReviewStore, 'get'>,
  input: JevPrepareInput,
  enabled: () => boolean
) {
  const review = reviews.get(input.reviewId)
  const version = review.versions.at(-1)!
  if (version.id !== input.versionId) {
    throw new Error('当前审阅版本已变化，请重新预览。')
  }
  if (version.workspace && version.workspace.target.hostId !== 'local') {
    throw new Error('当前主机尚不支持读取远端工作区。')
  }
  for (const key of input.mode === 'delivery' ? input.evidenceKeys : [input.evidenceKey]) {
    const file = version.workspace?.files.find((entry) => entry.evidenceKey === key)
    if (!file && !enabled()) {
      throw new Error('请先启用 Codex 使用情况读取。')
    }
    const row = version.audit.rows.find((entry) => codexEvidenceKey(entry) === key)
    if (!row && (!file || file.status !== 'read')) {
      throw new Error('此记录不属于当前审阅版本。')
    }
  }
  return { review, version }
}

export async function readJevAuditRequest(
  input: JevPrepareInput,
  model: string,
  review: CodexReview,
  version: CodexReviewVersion,
  readEvidence: typeof readCodexReviewEvidence
): Promise<{ request: JevRequest; basis?: JevDeliveryBasis }> {
  if (input.mode === 'delivery') {
    const assembled = await readJevDeliveryState(
      review,
      version,
      input.evidenceKeys,
      input.handoffEvidenceKeys,
      readEvidence
    )
    return {
      request: { model, state: assembled.state, questions: jevDeliveryQuestions },
      basis: {
        criterion: assembled.state.targetCriterion.text,
        sourceFingerprints: assembled.sourceFingerprints,
        questionHash: createHash('sha256')
          .update(JSON.stringify(jevDeliveryQuestions))
          .digest('hex'),
        evaluatorVersion: JEV_DELIVERY_EVALUATOR_VERSION,
        evaluationSuiteHash: JEV_DELIVERY_EVALUATION_SUITE_HASH
      }
    }
  }
  const row = version.audit.rows.find((entry) => codexEvidenceKey(entry) === input.evidenceKey)
  if (row?.recordFormat === 'response_message' && !row.messageTextChars) {
    throw new Error('此消息没有可读取的文字正文，暂不能审阅图片或摘要块。')
  }
  const record = await readEvidence(review, version.id, input.evidenceKey)
  const result = row?.resultSource
    ? await readEvidence(review, version.id, input.evidenceKey, 'result')
    : null
  const redact = version.workspace ? redactWorkspaceText : redactJevText
  return {
    request: buildJevRequest(model, {
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
}
