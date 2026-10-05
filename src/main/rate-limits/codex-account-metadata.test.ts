import { describe, expect, it, vi } from 'vitest'
import { mapCodexAccountMetadata } from './codex-account-metadata'
import { supplementCodexSessionWindow } from './codex-backend-usage-client'

vi.mock('./codex-backend-auth', () => ({
  createCodexBackendRequestSignal: () => new AbortController().signal,
  getCodexBackendAuthHeaders: async () => ({})
}))

describe('Codex subscription and credit metadata', () => {
  it('keeps backend account data when an older CLI lacks metadata and the account has only a weekly window', async () => {
    const limits = await supplementCodexSessionWindow(
      {
        provider: 'codex',
        session: null,
        weekly: { usedPercent: 96, windowMinutes: 10080, resetsAt: null, resetDescription: null },
        status: 'ok',
        error: null,
        updatedAt: 1
      },
      async () =>
        new Response(
          JSON.stringify({
            plan_type: 'pro',
            credits: { has_credits: false, unlimited: false, balance: '0' },
            rate_limit: { primary_window: { used_percent: 96, limit_window_seconds: 604800 } }
          })
        )
    )
    expect(limits).toMatchObject({
      planType: 'pro',
      credits: { balance: '0' },
      weekly: { usedPercent: 96 }
    })
  })
  it('preserves actual zero credits as credit units, without inferring price', () => {
    expect(
      mapCodexAccountMetadata({
        planType: 'pro',
        credits: { hasCredits: false, unlimited: false, balance: '0' }
      })
    ).toEqual({ planType: 'pro', credits: { hasCredits: false, unlimited: false, balance: '0' } })
  })
  it('accepts backend spelling and unlimited accounts without fabricating a balance', () => {
    expect(
      mapCodexAccountMetadata({
        plan_type: 'enterprise',
        credits: { has_credits: true, unlimited: true, balance: null }
      })
    ).toEqual({
      planType: 'enterprise',
      credits: { hasCredits: true, unlimited: true, balance: null }
    })
  })
  it('keeps missing and malformed balances unknown, distinct from zero', () => {
    expect(mapCodexAccountMetadata(null)).toEqual({})
    expect(mapCodexAccountMetadata({ planType: 'pro' }).credits).toBeUndefined()
    expect(
      mapCodexAccountMetadata({ credits: { hasCredits: true, unlimited: false, balance: '$20' } })
        .credits?.balance
    ).toBeNull()
    expect(mapCodexAccountMetadata({ credits: { balance: '123' } }).credits).toBeUndefined()
  })
})
