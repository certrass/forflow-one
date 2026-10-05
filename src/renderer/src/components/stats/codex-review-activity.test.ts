import { expect, it } from 'vitest'
import { JEV_QUESTION_VERSION } from '../../../../shared/jev-audit-types'
import { buildReviewActivity, summarizeReviewChecks } from './codex-review-activity'
import { review, receipt as historicalReceipt } from './review-workspace-fixtures'
import { deliveryReceipt } from './jev-delivery-fixtures'

const receipt = { ...historicalReceipt, questionVersion: JEV_QUESTION_VERSION }

it('counts current mixed checks without treating uncalibrated scores or probabilities as actionable findings', () => {
  const result = summarizeReviewChecks(
    [
      receipt,
      deliveryReceipt,
      { ...deliveryReceipt, id: 'pending-delivery', status: 'pending', result: null },
      {
        ...deliveryReceipt,
        id: 'old-delivery',
        basis: { ...deliveryReceipt.basis!, evaluatorVersion: 'obsolete' }
      }
    ],
    receipt.versionId
  )
  expect(result).toEqual({ total: 3, completed: 2, incomplete: 1, attention: 2 })
})

it('keeps unknown checks distinct from completed checks and scopes counts to a source version', () => {
  const receipts = [
    receipt,
    { ...receipt, id: 'pending', status: 'unknown' as const, result: null },
    { ...receipt, id: 'old', versionId: 'old' }
  ]
  expect(summarizeReviewChecks(receipts, receipt.versionId)).toEqual({
    total: 2,
    completed: 1,
    incomplete: 1,
    attention: 1
  })
  expect(summarizeReviewChecks(receipts, 'new')).toEqual({
    total: 0,
    completed: 0,
    incomplete: 0,
    attention: 0
  })
})

it('retains checks under other question versions in activity without counting them as current checks', () => {
  const outdated = [
    historicalReceipt,
    { ...receipt, id: 'future', questionVersion: 'forflow-review-future' },
    { ...historicalReceipt, id: 'pending', status: 'pending' as const, result: null }
  ]
  expect(summarizeReviewChecks(outdated, receipt.versionId)).toEqual({
    total: 0,
    completed: 0,
    incomplete: 0,
    attention: 0
  })
  expect(summarizeReviewChecks([...outdated, receipt], receipt.versionId)).toEqual({
    total: 1,
    completed: 1,
    incomplete: 0,
    attention: 1
  })
  const events = buildReviewActivity(review, outdated).filter((entry) => entry.kind === 'check')
  expect(events).toHaveLength(3)
  expect(events.map((event) => event.check)).toEqual(expect.arrayContaining(outdated))
})

it('orders persisted decisions with checks without assigning an old check to a new version', () => {
  const value = {
    ...review,
    versions: [...review.versions, { ...review.versions[0], id: 'next', createdAt: 5 }],
    comments: [
      { id: 'comment', versionId: 'next', issueId: null, text: 'Read the new result', createdAt: 8 }
    ],
    confirmations: [{ versionId: 'next', createdAt: 9, revision: 1 }]
  }
  const events = buildReviewActivity(value, [
    receipt,
    { ...receipt, id: 'foreign', reviewId: 'other' }
  ])
  expect(events.map((entry) => entry.kind)).toEqual([
    'version',
    'check',
    'version',
    'comment',
    'confirmation'
  ])
  expect(events[1]).toMatchObject({
    versionId: review.versions[0].id,
    evidenceKey: receipt.evidenceKey
  })
  expect(value.versions).toHaveLength(2)
})
