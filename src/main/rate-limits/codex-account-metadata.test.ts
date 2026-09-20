import { describe, expect, it } from 'vitest'
import { mapCodexAccountMetadata } from './codex-account-metadata'

describe('Codex subscription and credit metadata', () => {
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
