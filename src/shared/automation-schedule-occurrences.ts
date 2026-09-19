import type { AutomationSchedulePreset } from './automations-types'
import { parseSchedule } from './automation-schedule-parsing'
import { cronDateMatches } from './automation-cron-occurrence'
import { createAutomationZonedCalendar } from './automation-zoned-calendar'

const DAY_MS = 24 * 60 * 60 * 1000
// Leap-day cron schedules can have an eight-year gap across non-leap centuries.
const CRON_SCAN_DAYS = 9 * 366
const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

function scanOccurrence(
  schedule: string,
  dtstart: number,
  anchor: number,
  direction: 1 | -1,
  timezone?: string
): number | null {
  const rule = parseSchedule(schedule)
  const calendar = createAutomationZonedCalendar(timezone)
  const wall = calendar.wallTime(anchor)
  let day = Math.floor(wall / DAY_MS) * DAY_MS
  const hours =
    rule.kind === 'cron'
      ? [...rule.hours]
      : rule.freq === 'HOURLY'
        ? Array.from({ length: 24 }, (_, hour) => hour)
        : [rule.byHour]
  const minutes = rule.kind === 'cron' ? [...rule.minutes] : [rule.byMinute]
  const limit = rule.kind === 'cron' ? CRON_SCAN_DAYS : 370
  for (let i = 0; i < limit; i += 1, day += direction * DAY_MS) {
    const matches =
      rule.kind === 'cron'
        ? cronDateMatches(rule, day, true)
        : rule.freq !== 'WEEKLY' || rule.byDay.includes(DAY_CODES[new Date(day).getUTCDay()])
    if (!matches) {
      continue
    }
    const instants = calendar.instantsOnDay(day, hours, minutes)
    // Daily/weekly RRULEs keep their original single run on a folded calendar day.
    const candidates =
      rule.kind === 'rrule' && rule.freq !== 'HOURLY' ? instants.slice(0, 1) : instants
    if (direction === -1) {
      candidates.reverse()
    }
    const candidate = candidates.find(
      (instant) => instant >= dtstart && (direction === 1 ? instant > anchor : instant <= anchor)
    )
    if (candidate !== undefined) {
      return candidate
    }
  }
  return null
}

export function buildAutomationRrule(args: {
  preset: Exclude<AutomationSchedulePreset, 'custom'>
  hour: number
  minute: number
  dayOfWeek?: number
}): string {
  const hour = Math.max(0, Math.min(23, Math.floor(args.hour)))
  const minute = Math.max(0, Math.min(59, Math.floor(args.minute)))
  if (args.preset === 'hourly') {
    return `FREQ=HOURLY;BYMINUTE=${minute}`
  }
  if (args.preset === 'weekdays') {
    return `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=${hour};BYMINUTE=${minute}`
  }
  if (args.preset === 'weekly') {
    const day = DAY_CODES[Math.max(0, Math.min(6, Math.floor(args.dayOfWeek ?? 1)))]
    return `FREQ=WEEKLY;BYDAY=${day};BYHOUR=${hour};BYMINUTE=${minute}`
  }
  return `FREQ=DAILY;BYHOUR=${hour};BYMINUTE=${minute}`
}

export function buildAutomationCronSchedule(args: {
  preset: Exclude<AutomationSchedulePreset, 'custom'>
  hour: number
  minute: number
  dayOfWeek?: number
}): string {
  const hour = Math.max(0, Math.min(23, Math.floor(args.hour)))
  const minute = Math.max(0, Math.min(59, Math.floor(args.minute)))
  if (args.preset === 'hourly') {
    return `${minute} * * * *`
  }
  if (args.preset === 'weekdays') {
    return `${minute} ${hour} * * 1-5`
  }
  if (args.preset === 'weekly') {
    const day = Math.max(0, Math.min(6, Math.floor(args.dayOfWeek ?? 1)))
    return `${minute} ${hour} * * ${day}`
  }
  return `${minute} ${hour} * * *`
}

export function nextAutomationOccurrenceAfter(
  rrule: string,
  dtstart: number,
  after: number,
  timezone?: string
): number {
  const candidate = scanOccurrence(rrule, dtstart, Math.max(dtstart - 1, after), 1, timezone)
  if (candidate === null) {
    throw new Error('Unable to compute next automation run.')
  }
  return candidate
}

export function latestAutomationOccurrenceAtOrBefore(
  rrule: string,
  dtstart: number,
  now: number,
  timezone?: string
): number | null {
  if (now < dtstart) {
    return null
  }
  return scanOccurrence(rrule, dtstart, now, -1, timezone)
}
