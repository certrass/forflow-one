// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import type { JevReceipt } from '../../../../shared/jev-audit-types'
import { review } from './review-workspace-fixtures'
import { deliveryReceipt } from './jev-delivery-fixtures'
import { JevDeliveryResults } from './JevDeliveryResults'
import { jevAuditCopy } from './jev-audit-copy'

beforeEach(async () => {
  await i18n.changeLanguage('en')
})
afterEach(cleanup)

function withEvidence(choice: string): JevReceipt {
  const receipt = structuredClone(deliveryReceipt)
  if (!receipt.result) {
    throw new Error('The fixture needs a Jev response')
  }
  receipt.result.answers.criterion_evidence = {
    type: 'choice',
    choice,
    confidence: 0.4,
    probabilities: { supported: 0.4, insufficient: 0.3, unmet: 0.2, conflicting: 0.1 }
  }
  return receipt
}

it.each([
  [
    'supported',
    'The material supports this requirement',
    'confirm this review version when ready.'
  ],
  [
    'insufficient',
    'More evidence is needed before deciding',
    'More execution results or supporting materials are needed'
  ],
  [
    'unmet',
    'The material records a failure to meet the requirement',
    'After a fix, add its linked retest result'
  ],
  ['conflicting', 'The records disagree', 'Check which object and version each result belongs to']
])('explains the %s judgment without applying a confidence threshold', (choice, title, action) => {
  render(
    <JevDeliveryResults
      receipt={withEvidence(choice)}
      review={review}
      disabled={false}
      onAccept={vi.fn()}
    />
  )
  const summary = screen.getByTestId('jev-result-summary')
  expect(within(summary).getByRole('heading', { name: title })).toBeVisible()
  expect(summary).toHaveTextContent(action)
  expect(summary).toHaveTextContent('Awaiting review')
  expect(screen.getByTestId('jev-check-details')).not.toHaveAttribute('open')
  expect(screen.getByText(/Model confidence: 40.0%/)).not.toBeVisible()
  fireEvent.click(screen.getByText('Check details'))
  expect(screen.getByText(/Model confidence: 40.0%/)).toBeVisible()
})

it.each(['missing-answer', 'wrong-primitive', 'unfinished', 'historical'])(
  'does not present supported evidence as a current complete judgment when %s',
  (condition) => {
    const receipt = withEvidence('supported')
    if (!receipt.result || !receipt.basis) {
      throw new Error('The fixture needs a complete delivery response')
    }
    if (condition === 'missing-answer') {
      delete receipt.result.answers.handoff_operability
    } else if (condition === 'wrong-primitive') {
      receipt.result.answers.handoff_operability = { type: 'noul', noul: 1 }
    } else if (condition === 'unfinished') {
      receipt.status = 'unknown'
    } else {
      receipt.basis.evaluatorVersion = 'earlier-evaluator'
    }
    receipt.result.answers.criterion_clarity = {
      type: 'choice',
      choice: 'ambiguous',
      confidence: 1,
      probabilities: { ambiguous: 1 }
    }
    const onAccept = vi.fn()
    render(
      <JevDeliveryResults receipt={receipt} review={review} disabled={false} onAccept={onAccept} />
    )
    const summary = screen.getByTestId('jev-result-summary')
    expect(summary).not.toHaveTextContent('The material supports this requirement')
    expect(summary).toHaveTextContent(
      condition === 'historical' ? 'earlier evaluator' : 'No complete judgment'
    )
    fireEvent.click(screen.getByText('Check details'))
    const button = screen.getByRole('button', { name: jevAuditCopy().accept })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onAccept).not.toHaveBeenCalled()
    if (condition === 'missing-answer') {
      expect(screen.getByText(/No answer was returned for this check/)).toBeVisible()
    }
  }
)

it('explains what Noul and Score measure and retains their raw numeric outputs', () => {
  render(
    <JevDeliveryResults
      receipt={deliveryReceipt}
      review={review}
      disabled={false}
      onAccept={vi.fn()}
    />
  )
  fireEvent.click(screen.getByText('Check details'))
  expect(
    screen.getByText(
      /Probability that the material explicitly records an unresolved failure.*90.0%/
    )
  ).toBeVisible()
  expect(
    screen.getByText(/A low probability does not show that the requirement was met/)
  ).toBeVisible()
  expect(screen.getByText(/1.81 \/ 4/)).toBeVisible()
  expect(screen.getByText(/not delivery quality or acceptance/)).toBeVisible()
  expect(screen.getByText(/a low score does not mean the delivery failed/)).toBeVisible()
  expect(screen.getByText(/Recomputed from displayed probabilities: 1.70/)).toBeVisible()
  const distribution = screen.getAllByText('Probability distribution')[0].closest('details')
  expect(distribution).not.toHaveAttribute('open')
  fireEvent.click(screen.getAllByText('Probability distribution')[0])
  expect(distribution).toHaveAttribute('open')
})

it('keeps a supported result tied to its historical review version', () => {
  render(
    <JevDeliveryResults
      receipt={withEvidence('supported')}
      review={{
        ...review,
        versions: [...review.versions, { ...review.versions[0], id: 'new-version' }]
      }}
      disabled={false}
      onAccept={vi.fn()}
    />
  )
  const summary = screen.getByTestId('jev-result-summary')
  expect(summary).toHaveTextContent('This judgment belongs to an earlier review version')
  expect(summary).not.toHaveTextContent('The material supports this requirement')
})

it('records only actionable choice results and navigation never initiates another check', () => {
  const onAccept = vi.fn()
  const onRecheck = vi.fn()
  const props = { receipt: deliveryReceipt, review, disabled: false, onAccept, onRecheck }
  const view = render(<JevDeliveryResults {...props} />)
  const summary = screen.getByTestId('jev-result-summary')
  fireEvent.click(within(summary).getByRole('button', { name: jevAuditCopy().accept }))
  expect(onAccept).toHaveBeenCalledExactlyOnceWith(deliveryReceipt.id, 'criterion_evidence')
  fireEvent.click(screen.getByText('Check details'))
  expect(
    within(screen.getByTestId('jev-check-details')).queryByRole('button', {
      name: jevAuditCopy().accept
    })
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Choose materials again' }))
  expect(onRecheck).toHaveBeenCalledTimes(1)
  expect(onAccept).toHaveBeenCalledTimes(1)
  const onIssues = vi.fn()
  view.rerender(
    <JevDeliveryResults
      {...props}
      onIssues={onIssues}
      review={{
        ...review,
        issues: [
          {
            id: 'issue',
            versionId: deliveryReceipt.versionId,
            evidenceKey: 'evidence',
            title: 'Missing test result',
            detail: `[Jev:${deliveryReceipt.id}:criterion_evidence]`,
            status: 'open',
            createdAt: 1,
            resolution: null,
            resolvedInVersion: null
          }
        ]
      }}
    />
  )
  expect(screen.getByRole('button', { name: jevAuditCopy().accepted })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'View issues' }))
  expect(onIssues).toHaveBeenCalledTimes(1)
  expect(onAccept).toHaveBeenCalledTimes(1)
})

it('allows navigation away from an obsolete judgment while keeping adoption disabled', () => {
  const receipt = withEvidence('unmet')
  if (!receipt.basis) {
    throw new Error('The fixture needs an evaluator')
  }
  receipt.basis.evaluatorVersion = 'earlier-evaluator'
  const onRecheck = vi.fn()
  const onAccept = vi.fn()
  const view = render(
    <JevDeliveryResults
      receipt={receipt}
      review={review}
      disabled
      navigationDisabled={false}
      onRecheck={onRecheck}
      onAccept={onAccept}
    />
  )
  expect(screen.getByRole('button', { name: jevAuditCopy().accept })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Choose materials again' }))
  expect(onRecheck).toHaveBeenCalledTimes(1)
  expect(onAccept).not.toHaveBeenCalled()
  view.rerender(
    <JevDeliveryResults
      receipt={receipt}
      review={review}
      disabled
      onRecheck={onRecheck}
      onAccept={onAccept}
    />
  )
  expect(screen.getByRole('button', { name: 'Choose materials again' })).toBeDisabled()
})
