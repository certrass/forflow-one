import type { ProviderRateLimits } from '../../shared/rate-limit-types'

export function mapCodexAccountMetadata(
  value: unknown
): Pick<ProviderRateLimits, 'planType' | 'credits'> {
  if (!value || typeof value !== 'object') {
    return {}
  }
  const plan = 'planType' in value ? value.planType : 'plan_type' in value ? value.plan_type : null
  const raw = 'credits' in value ? value.credits : undefined
  const planType = typeof plan === 'string' && plan.length <= 80 ? plan : null
  if (!raw || typeof raw !== 'object') {
    return { planType, ...(raw === null ? { credits: null } : {}) }
  }
  const hasCredits =
    'hasCredits' in raw ? raw.hasCredits : 'has_credits' in raw ? raw.has_credits : null
  const unlimited = 'unlimited' in raw ? raw.unlimited : null
  const balance = 'balance' in raw ? raw.balance : null
  if (typeof hasCredits !== 'boolean' || typeof unlimited !== 'boolean') {
    return { planType }
  }
  return {
    planType,
    credits: {
      hasCredits,
      unlimited,
      balance:
        typeof balance === 'string' && /^\d+(\.\d+)?$/.test(balance) && balance.length <= 40
          ? balance
          : null
    }
  }
}
