import { translate } from '@/i18n/i18n'
export function formatTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`
  }
  return value.toLocaleString()
}

export function formatCost(value: number | null): string {
  if (value === null) {
    return translate('forflow.usage.67a926f700', 'Not available')
  }
  return value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`
}

export function formatUpdatedAt(timestamp: number | null): string {
  if (!timestamp) {
    return translate('forflow.usage.50e631f628', 'Not scanned yet')
  }
  return translate('forflow.usage.updated', 'Updated {{time}}', {
    time: new Date(timestamp).toLocaleString()
  })
}

export function formatSessionTime(timestamp: string): string {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return timestamp
  }
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
