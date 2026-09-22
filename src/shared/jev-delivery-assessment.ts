import type { JevAnswer } from './jev-native-types'
import {
  JEV_DELIVERY_EVALUATION_SUITE_HASH,
  JEV_DELIVERY_EVALUATOR_VERSION,
  JEV_DELIVERY_QUESTION_VERSION,
  JEV_MODEL,
  JEV_QUESTION_VERSION,
  type JevReceipt
} from './jev-audit-types'

const actionableChoices: Record<string, readonly string[]> = {
  outcome: ['attention', 'unknown'],
  evidence: ['missing', 'unknown'],
  claim: ['conflict', 'unknown'],
  criterion_clarity: ['ambiguous', 'missing'],
  criterion_evidence: ['unmet', 'insufficient', 'conflicting'],
  handoff_criterion_coverage: ['partial', 'none', 'unclear']
}

export function canRecordJevAnswer(question: string, answer: JevAnswer): boolean {
  return answer.type === 'choice' && (actionableChoices[question]?.includes(answer.choice) ?? false)
}

export function hasCurrentJevEvaluator(receipt: JevReceipt): boolean {
  if (
    receipt.requestedModel !== JEV_MODEL ||
    (receipt.result && receipt.result.model !== JEV_MODEL)
  ) {
    return false
  }
  if (receipt.mode !== 'delivery') {
    return receipt.questionVersion === JEV_QUESTION_VERSION
  }
  return (
    !JEV_DELIVERY_EVALUATOR_VERSION.endsWith(':unbuilt') &&
    receipt.questionVersion === JEV_DELIVERY_QUESTION_VERSION &&
    receipt.basis?.evaluatorVersion === JEV_DELIVERY_EVALUATOR_VERSION &&
    receipt.basis.evaluationSuiteHash === JEV_DELIVERY_EVALUATION_SUITE_HASH
  )
}

export function jevScoreArithmeticDiagnostic(answer: JevAnswer): {
  reported: number
  weighted: number
  absoluteDelta: number
  differs: boolean
} | null {
  if (answer.type !== 'score') {
    return null
  }
  const weighted = Object.entries(answer.probabilities).reduce(
    (sum, [grade, probability]) => sum + Number(grade) * probability,
    0
  )
  const absoluteDelta = Math.abs(answer.score - weighted)
  return { reported: answer.score, weighted, absoluteDelta, differs: absoluteDelta >= 0.005 }
}
