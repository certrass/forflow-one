import { expect, it } from 'vitest'
import { buildReviewActivity, summarizeReviewChecks } from './codex-review-activity'
import { review, receipt } from './review-workspace-fixtures'

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
