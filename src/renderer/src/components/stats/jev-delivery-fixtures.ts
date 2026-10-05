import {
  JEV_DELIVERY_EVALUATION_SUITE_HASH,
  JEV_DELIVERY_EVALUATOR_VERSION,
  JEV_DELIVERY_QUESTION_VERSION,
  type JevDeliveryBasis,
  type JevReceipt
} from '../../../../shared/jev-audit-types'
import { receipt } from './review-workspace-fixtures'

export const deliveryBasis: JevDeliveryBasis = {
  criterion: 'Did it complete?',
  questionHash: 'd'.repeat(64),
  sourceFingerprints: [{ evidenceKey: 'evidence', sha256: 'e'.repeat(64) }],
  evaluatorVersion: JEV_DELIVERY_EVALUATOR_VERSION,
  evaluationSuiteHash: JEV_DELIVERY_EVALUATION_SUITE_HASH
}

export const deliveryReceipt: JevReceipt = {
  ...receipt,
  mode: 'delivery',
  evidenceKeys: ['evidence'],
  handoffEvidenceKeys: [],
  questionVersion: JEV_DELIVERY_QUESTION_VERSION,
  basis: deliveryBasis,
  result: {
    model: receipt.requestedModel,
    usage: { input_tokens: 123, output_tokens: 45 },
    answers: {
      criterion_clarity: {
        type: 'choice',
        choice: 'clear',
        confidence: 0.8,
        probabilities: { clear: 0.8, ambiguous: 0.1, missing: 0.1 }
      },
      criterion_evidence: {
        type: 'choice',
        choice: 'insufficient',
        confidence: 0.7,
        probabilities: { supported: 0.1, insufficient: 0.7, unmet: 0.1, conflicting: 0.1 }
      },
      documented_current_nonconformance: { type: 'noul', noul: 0.9 },
      handoff_operability: {
        type: 'score',
        score: 1.81,
        confidence: 0.8,
        legend: { '0': 'None', '1': 'Vague', '2': 'Partial', '3': 'Actionable', '4': 'Complete' },
        probabilities: { '0': 0.1, '1': 0.1, '2': 0.8, '3': 0, '4': 0 }
      },
      handoff_criterion_coverage: {
        type: 'choice',
        choice: 'full',
        confidence: 1,
        probabilities: { full: 1, partial: 0, none: 0, unclear: 0 }
      }
    }
  }
}
