// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AppState } from '../../store/types'
import { createEmptyRateLimitState } from '../../../../shared/rate-limit-state-factory'
import { CodexAccountUsage } from './CodexAccountUsage'

const { store } = vi.hoisted(() => {
  const store: Partial<AppState> = {}
  return { store }
})
vi.mock('../../store', () => ({
  useAppStore: (selector: (state: Partial<AppState>) => unknown) => selector(store)
}))
afterEach(cleanup)
beforeEach(() => {
  store.rateLimits = createEmptyRateLimitState()
  store.fetchRateLimits = vi.fn(async () => {})
})

it('shows real plan, zero credit balance and quota separately from project estimates', () => {
  store.rateLimits = {
    ...createEmptyRateLimitState(),
    codex: {
      provider: 'codex',
      planType: 'pro',
      credits: { hasCredits: false, unlimited: false, balance: '0' },
      session: null,
      weekly: { usedPercent: 96, windowMinutes: 10080, resetsAt: null, resetDescription: null },
      status: 'ok',
      error: null,
      updatedAt: Date.now()
    }
  }
  render(<CodexAccountUsage />)
  expect(screen.getByText('Pro')).toBeVisible()
  expect(screen.getByText('0', { exact: true })).toBeVisible()
  expect(screen.getByText('已用 96%')).toBeVisible()
  expect(screen.getByText(/套餐与额度不受下方日志/)).toBeVisible()
  expect(screen.getByRole('button', { name: '官方用量与账单' })).toBeVisible()
  expect(screen.queryByText(/\$200|已结算 0|分摊 0/)).not.toBeInTheDocument()
})

it('does not treat absent account data as zero or invent a subscription', () => {
  render(<CodexAccountUsage />)
  expect(screen.getByText('未返回套餐')).toBeVisible()
  expect(screen.getByText('未返回余额')).toBeVisible()
  expect(screen.getAllByText('未返回窗口')).toHaveLength(2)
  expect(screen.queryByText('0', { exact: true })).not.toBeInTheDocument()
})
