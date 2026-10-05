import { describe, expect, it } from 'vitest'
import {
  JEV_MODEL,
  jevPrepareSchema,
  jevReceiptSchema,
  type JevDeliveryRequest
} from '../../shared/jev-audit-types'
import {
  canRecordJevAnswer,
  jevScoreArithmeticDiagnostic
} from '../../shared/jev-delivery-assessment'
import { jevDeliveryQuestions } from '../../shared/jev-delivery-questions'
import { validateJevResponse } from './jev-client'

const request: JevDeliveryRequest = {
  model: JEV_MODEL,
  state: {
    object: { kind: 'workspace', id: 'selected-object', version: 'current' },
    goal: 'Unauthorized requests are rejected',
    targetCriterion: { id: 'R1', text: 'Unauthorized requests return HTTP 403' },
    sources: [
      { id: 'S1', role: 'execution_result', text: 'HTTP 403', truncated: false, omitted: false }
    ],
    handoff: { sourceIds: [] },
    coverage: {
      selection: 'explicit',
      wholeProject: false,
      partial: true,
      truncated: false,
      omitted: false
    }
  },
  questions: jevDeliveryQuestions
}

function response() {
  return {
    model: JEV_MODEL,
    answers: {
      criterion_clarity: {
        type: 'choice' as const,
        choice: 'clear',
        confidence: 0.8,
        probabilities: { clear: 0.9, ambiguous: 0.1, missing: 0 }
      },
      criterion_evidence: {
        type: 'choice' as const,
        choice: 'insufficient',
        confidence: 0.5,
        probabilities: { supported: 0.3, unmet: 0, insufficient: 0.7, conflicting: 0 }
      },
      documented_current_nonconformance: { type: 'noul' as const, noul: 0.08 },
      handoff_operability: {
        type: 'score' as const,
        score: 3.95,
        confidence: 0.96,
        legend: Object.fromEntries(
          jevDeliveryQuestions.handoff_operability.criteria.map((value, index) => [
            String(index),
            value
          ])
        ),
        probabilities: { '0': 0, '1': 0, '2': 0, '3': 0.05, '4': 0.95 }
      },
      handoff_criterion_coverage: {
        type: 'choice' as const,
        choice: 'none',
        confidence: 0.9,
        probabilities: { full: 0, partial: 0, none: 1, unclear: 0 }
      }
    },
    usage: { input_tokens: 1200, output_tokens: 180 }
  }
}

describe('Jev native delivery responses', () => {
  it('retains native Noul probability and Score distribution without invented fields', () => {
    const result = validateJevResponse(response(), request)
    expect(result).toEqual(response())
    expect(result.answers.documented_current_nonconformance).not.toHaveProperty('confidence')
    expect(result.answers.documented_current_nonconformance).not.toHaveProperty('probabilities')
  })

  it.each([
    (value: ReturnType<typeof response>) => {
      value.answers.documented_current_nonconformance.noul = -0.1
    },
    (value: ReturnType<typeof response>) => {
      value.answers.documented_current_nonconformance.noul = 1.01
    },
    (value: ReturnType<typeof response>) => {
      value.answers.handoff_operability.score = 4.01
    },
    (value: ReturnType<typeof response>) => {
      value.answers.handoff_operability.score = -0.1
    },
    (value: ReturnType<typeof response>) => {
      value.answers.handoff_operability.confidence = 1.1
    },
    (value: ReturnType<typeof response>) => {
      value.answers.handoff_operability.probabilities['4'] = 0.8
    },
    (value: ReturnType<typeof response>) => {
      value.answers.handoff_operability.legend['4'] = 'Accepted'
    },
    (value: ReturnType<typeof response>) => {
      value.answers.handoff_operability.legend.extra = 'extra'
    },
    (value: ReturnType<typeof response>) => {
      value.answers.criterion_evidence.choice = 'accepted'
    }
  ])('rejects invalid ranges, vectors, labels and scale legends', (change) => {
    const value = response()
    change(value)
    expect(() => validateJevResponse(value, request)).toThrow('不符合')
  })

  it('rejects primitive substitution, missing and extra questions', () => {
    const value = response()
    expect(() =>
      validateJevResponse(
        {
          ...value,
          answers: {
            ...value.answers,
            documented_current_nonconformance: value.answers.criterion_clarity
          }
        },
        request
      )
    ).toThrow('不符合')
    const { handoff_operability: _score, ...missing } = value.answers
    expect(() => validateJevResponse({ ...value, answers: missing }, request)).toThrow('不符合')
    expect(() =>
      validateJevResponse({ ...value, answers: { ...value.answers, extra: _score } }, request)
    ).toThrow('不符合')
  })

  it('rejects the observed 0.99 coverage probability mass without normalizing it', () => {
    const value = response()
    value.answers.handoff_criterion_coverage = {
      type: 'choice',
      choice: 'full',
      confidence: 0.91,
      probabilities: { partial: 0.04, none: 0.02, full: 0.93, unclear: 0 }
    }
    expect(() => validateJevResponse(value, request)).toThrow('不符合')
    expect(value.answers.handoff_criterion_coverage.probabilities.full).toBe(0.93)
  })

  it('retains the reported Score and separately exposes arithmetic differences', () => {
    const value = response()
    value.answers.handoff_operability.score = 3.94
    const result = validateJevResponse(value, request)
    expect(result.answers.handoff_operability).toEqual(value.answers.handoff_operability)
    expect(jevScoreArithmeticDiagnostic(result.answers.handoff_operability)).toEqual({
      reported: 3.94,
      weighted: expect.closeTo(3.95),
      absoluteDelta: expect.closeTo(0.01),
      differs: true
    })
  })

  it('requires human recording and never turns native numeric thresholds into issues', () => {
    const { answers } = response()
    expect(canRecordJevAnswer('criterion_clarity', answers.criterion_clarity)).toBe(false)
    expect(canRecordJevAnswer('criterion_evidence', answers.criterion_evidence)).toBe(true)
    expect(
      canRecordJevAnswer('handoff_criterion_coverage', answers.handoff_criterion_coverage)
    ).toBe(true)
    expect(canRecordJevAnswer('documented_current_nonconformance', { type: 'noul', noul: 1 })).toBe(
      false
    )
    expect(
      canRecordJevAnswer('handoff_operability', { ...answers.handoff_operability, score: 0 })
    ).toBe(false)
    expect(canRecordJevAnswer('unknown_question', answers.criterion_evidence)).toBe(false)
  })
})

describe('Jev delivery input and historical receipt compatibility', () => {
  const base = { reviewId: 'a'.repeat(64), versionId: 'b'.repeat(64) }
  const delivery = { ...base, mode: 'delivery', evidenceKeys: ['e1'], handoffEvidenceKeys: ['e1'] }

  it('requires an explicit bounded selection and handoff subset', () => {
    expect(jevPrepareSchema.safeParse(delivery).success).toBe(true)
    for (const invalid of [
      { ...delivery, evidenceKeys: [] },
      { ...delivery, evidenceKeys: Array.from({ length: 13 }, (_, i) => `e${i}`) },
      { ...delivery, evidenceKeys: ['e1', 'e1'] },
      { ...delivery, handoffEvidenceKeys: ['unselected'] },
      { ...delivery, handoffEvidenceKeys: ['e1', 'e1'] },
      { ...delivery, evidenceKey: 'legacy' }
    ]) {
      expect(jevPrepareSchema.safeParse(invalid).success).toBe(false)
    }
  })

  it('preserves legacy prepare default and historical Choice receipts', () => {
    expect(jevPrepareSchema.parse({ ...base, evidenceKey: 'e1' })).toEqual({
      ...base,
      evidenceKey: 'e1',
      claim: ''
    })
    const legacy = {
      ...base,
      id: '61d9bcdd-855e-48b9-b4a2-f3e8297e8e85',
      evidenceKey: 'e1',
      inputHash: 'c'.repeat(64),
      questionVersion: 'forflow-review-v2',
      requestedModel: JEV_MODEL,
      createdAt: 1,
      completedAt: 2,
      status: 'completed',
      result: {
        model: JEV_MODEL,
        answers: { outcome: response().answers.criterion_clarity },
        usage: { input_tokens: 20, output_tokens: 0 }
      },
      error: null
    }
    expect(jevReceiptSchema.parse(legacy)).toEqual(legacy)
  })
})
