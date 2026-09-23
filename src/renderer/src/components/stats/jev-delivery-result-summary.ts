import type { JevReceipt } from '../../../../shared/jev-audit-types'
import { hasCurrentJevEvaluator } from '../../../../shared/jev-delivery-assessment'

export function jevDeliveryResultSummary(receipt: JevReceipt, latestVersionId?: string) {
  if (receipt.status !== 'completed' || !receipt.result) {
    return 'incomplete'
  }
  if (!hasCurrentJevEvaluator(receipt)) {
    return 'historical'
  }
  if (latestVersionId && receipt.versionId !== latestVersionId) {
    return 'previousVersion'
  }
  const answers = receipt.result.answers
  if (
    answers.criterion_clarity?.type !== 'choice' ||
    answers.criterion_evidence?.type !== 'choice' ||
    answers.documented_current_nonconformance?.type !== 'noul' ||
    answers.handoff_operability?.type !== 'score' ||
    answers.handoff_criterion_coverage?.type !== 'choice'
  ) {
    return 'incomplete'
  }
  switch (answers.criterion_evidence.choice) {
    case 'supported':
    case 'unmet':
    case 'insufficient':
    case 'conflicting':
      return answers.criterion_evidence.choice
    default:
      return 'incomplete'
  }
}
