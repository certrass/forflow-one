// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, expect, it, vi } from 'vitest'
import { review } from './review-workspace-fixtures'
import { CodexReviewEvidence } from './CodexReviewEvidence'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('opens the linked record’s page, highlights it and scrolls to it', () => {
  const scrolled = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
  const version = {
    ...review.versions[0],
    audit: {
      ...review.versions[0].audit,
      rows: Array.from({ length: 45 }, (_, index) => ({
        ...review.versions[0].audit.rows[0],
        evidenceKey: `record-${index}`,
        recordId: `call-${index}`
      }))
    }
  }
  render(
    <CodexReviewEvidence
      review={review}
      version={version}
      onFlag={vi.fn()}
      readOnly={false}
      locateKey="record-27"
    />
  )
  const located = screen.getByText('call-27').closest('tr')
  expect(located).toHaveAttribute('data-current', 'true')
  expect(screen.getByText('call-26').closest('tr')).toHaveAttribute('data-current', 'false')
  expect(screen.getByText('2 / 3')).toBeVisible()
  expect(screen.queryByText('call-0')).toBeNull()
  expect(scrolled).toHaveBeenCalledExactlyOnceWith({ block: 'nearest' })
  expect(scrolled.mock.contexts[0]).toBe(located)
})
