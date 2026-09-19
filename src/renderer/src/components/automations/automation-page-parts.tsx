import { translate } from '@/i18n/i18n'
import React from 'react'
import type { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AutomationRun } from '../../../../shared/automations-types'

export function formatAutomationDateTime(value: number | null | undefined): string {
  if (!value) {
    return translate('forflow.desktopCopy.6300ef800b', 'Never')
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(value)
}

export function formatAutomationRelativeTime(
  value: number | null | undefined,
  now = Date.now()
): string | null {
  if (!value) {
    return null
  }
  const diffMs = value - now
  const absMs = Math.abs(diffMs)
  const minuteMs = 60 * 1000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs
  const format = (amount: number, unit: string): string => `${amount}${unit}`
  let text: string
  if (absMs < minuteMs) {
    text = translate('forflow.finalCopy.ed5eb9a37e', 'now')
  } else if (absMs < hourMs) {
    text = format(Math.round(absMs / minuteMs), translate('forflow.finalCopy.62c66a7a5d', 'm'))
  } else if (absMs < dayMs) {
    text = format(Math.round(absMs / hourMs), translate('forflow.finalCopy.aaa9402664', 'h'))
  } else {
    text = format(Math.round(absMs / dayMs), translate('forflow.finalCopy.18ac3e7343', 'd'))
  }
  if (absMs < minuteMs) {
    return text
  }
  return diffMs >= 0
    ? translate('forflow.finalCopy.c93c357fc8', 'in {{time}}', { time: text })
    : translate('forflow.finalCopy.8d32021fd6', '{{time}} ago', { time: text })
}

export function formatAutomationDateTimeWithRelative(
  value: number | null | undefined,
  now = Date.now()
): string {
  const absolute = formatAutomationDateTime(value)
  const relative = formatAutomationRelativeTime(value, now)
  return relative ? `${absolute} (${relative})` : absolute
}

export function getAutomationRunStatusVariant(
  status: AutomationRun['status']
): React.ComponentProps<typeof Badge>['variant'] {
  if (status === 'dispatched' || status === 'completed') {
    return 'secondary'
  }
  if (status.startsWith('skipped')) {
    return 'outline'
  }
  if (status === 'dispatch_failed') {
    return 'destructive'
  }
  return 'dot'
}

export function getAutomationRunStatusLabel(status: AutomationRun['status']): string {
  switch (status) {
    case 'pending':
      return translate('forflow.desktopCopy.661ff40a07', 'Queued')
    case 'dispatching':
      return translate('forflow.desktopCopy.aeed4d26bb', 'Starting')
    case 'dispatched':
      return translate('forflow.desktopCopy.cf55727a95', 'Launched')
    case 'completed':
      return translate('forflow.desktopCopy.11a6767d56', 'Done')
    case 'skipped_precheck':
      return translate('forflow.desktopCopy.2fa901e83e', 'Precheck skipped')
    case 'skipped_missed':
      return translate('forflow.desktopCopy.12698ce1ea', 'Skipped')
    case 'skipped_unavailable':
      return translate('forflow.desktopCopy.ca18449697', 'Unavailable')
    case 'skipped_needs_interactive_auth':
      return translate('forflow.desktopCopy.5e2c387258', 'Needs credentials')
    case 'dispatch_failed':
      return translate('forflow.desktopCopy.031a8f0f65', 'Failed')
  }
}

export const AUTOMATION_EDITOR_SECTION_LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-[0.05em]'

export function Field({
  label,
  children,
  className,
  labelClassName
}: {
  label: React.ReactNode
  children: React.ReactNode
  className?: string
  labelClassName?: string
}): React.JSX.Element {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <div className={cn('text-xs text-muted-foreground', labelClassName)}>{label}</div>
      {children}
    </div>
  )
}
