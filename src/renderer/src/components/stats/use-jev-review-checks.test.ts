// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { JevReceipt } from '../../../../shared/jev-audit-types'
import { receipt, review } from './review-workspace-fixtures'
import { useJevReviewChecks } from './use-jev-review-checks'

const originalApi = window.api
afterEach(() => {
  cleanup()
  Object.defineProperty(window, 'api', { configurable: true, value: originalApi })
})

it('keeps a completed check when an earlier list response arrives later', async () => {
  let finish: ((value: JevReceipt[]) => void) | undefined
  const list = vi.fn(
    () =>
      new Promise<JevReceipt[]>((resolve) => {
        finish = resolve
      })
  )
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { forflowJevAudit: { list } }
  })
  const { result } = renderHook(() => useJevReviewChecks(review.id))
  act(() => result.current.record(receipt))
  expect(result.current.receipts).toEqual([receipt])
  act(() => result.current.record({ ...receipt, reviewId: 'another-review' }))
  expect(result.current.receipts).toEqual([receipt])
  await act(async () => finish?.([{ ...receipt, status: 'pending', result: null }]))
  expect(result.current.receipts).toEqual([receipt])
  list.mockResolvedValue([receipt])
  act(() => result.current.refresh())
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  expect(result.current.receipts).toEqual([receipt])
})

it('does not display another review’s receipts while its list is loading', async () => {
  const list = vi
    .fn()
    .mockResolvedValueOnce([receipt])
    .mockReturnValue(new Promise(() => {}))
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { forflowJevAudit: { list } }
  })
  const { result, rerender } = renderHook(({ id }) => useJevReviewChecks(id), {
    initialProps: { id: review.id }
  })
  await waitFor(() => expect(result.current.receipts).toEqual([receipt]))
  rerender({ id: 'another-review' })
  expect(result.current.receipts).toEqual([])
})
