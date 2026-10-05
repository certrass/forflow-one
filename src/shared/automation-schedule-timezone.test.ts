import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  latestAutomationOccurrenceAtOrBefore as latest,
  nextAutomationOccurrenceAfter as next
} from './automation-schedule-occurrences'

const start = Date.parse('2026-01-01T00:00:00Z')
afterEach(() => vi.unstubAllEnvs())

describe('automation schedule timezone', () => {
  it.each(['0 9 * * *', 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0'])(
    'uses the saved timezone for %s independently of the host',
    (schedule) => {
      vi.stubEnv('TZ', 'Asia/Shanghai')
      const now = Date.parse('2026-09-19T00:00:00Z')
      expect(next(schedule, start, now, 'UTC')).toBe(Date.parse('2026-09-19T09:00:00Z'))
      expect(next(schedule, start, now, 'Asia/Shanghai')).toBe(Date.parse('2026-09-19T01:00:00Z'))
      expect(latest(schedule, start, now, 'UTC')).toBe(Date.parse('2026-09-18T09:00:00Z'))
      expect(latest(schedule, start, now, 'Asia/Shanghai')).toBe(Date.parse('2026-09-18T01:00:00Z'))
    }
  )

  it.each(['30 1 * * *', 'FREQ=DAILY;BYHOUR=1;BYMINUTE=30', 'FREQ=HOURLY;BYMINUTE=30'])(
    'preserves recurrence fold semantics and then advances strictly for %s',
    (schedule) => {
      const first = Date.parse('2026-11-01T05:30:00Z')
      const second = Date.parse('2026-11-01T06:30:00Z')
      expect(next(schedule, start, first - 1, 'America/New_York')).toBe(first)
      expect(next(schedule, start, first, 'America/New_York')).toBe(
        schedule.includes('DAILY') ? Date.parse('2026-11-02T06:30:00Z') : second
      )
      const following = next(schedule, start, second, 'America/New_York')
      expect(following).toBeGreaterThan(second)
      expect(following).toBe(
        Date.parse(schedule.includes('HOURLY') ? '2026-11-01T07:30:00Z' : '2026-11-02T06:30:00Z')
      )
      expect(latest(schedule, start, second, 'America/New_York')).toBe(
        schedule.includes('DAILY') ? first : second
      )
    }
  )

  it('orders dense cron occurrences by instant across a repeated hour', () => {
    const now = Date.parse('2026-11-01T05:45:00Z')
    expect(next('* * * * *', start, now, 'America/New_York')).toBe(now + 60_000)
    expect(latest('* * * * *', start, now, 'America/New_York')).toBe(now)
  })

  it.each(['30 2 * * *', 'FREQ=DAILY;BYHOUR=2;BYMINUTE=30'])(
    'skips spring-forward gaps for %s',
    (schedule) => {
      expect(next(schedule, start, Date.parse('2026-03-08T05:00:00Z'), 'America/New_York')).toBe(
        Date.parse('2026-03-09T06:30:00Z')
      )
    }
  )

  it('handles half-hour DST folds and quarter-hour timezone offsets', () => {
    const first = Date.parse('2026-04-04T14:45:00Z')
    expect(next('45 1 * * *', start, first, 'Australia/Lord_Howe')).toBe(first + 30 * 60_000)
    expect(next('0 9 * * *', start, Date.parse('2026-09-19T00:00:00Z'), 'Asia/Kathmandu')).toBe(
      Date.parse('2026-09-19T03:15:00Z')
    )
  })

  it('retains stepped cron and weekly RRULE schedules', () => {
    const now = Date.parse('2026-09-19T00:01:00Z')
    expect(next('*/15 * * * *', start, now, 'UTC')).toBe(Date.parse('2026-09-19T00:15:00Z'))
    expect(next('FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0', start, now, 'Asia/Shanghai')).toBe(
      Date.parse('2026-09-21T01:00:00Z')
    )
  })

  it('keeps sparse leap-day scans bounded by calendar days', () => {
    expect(
      next(
        '0 9 29 2 *',
        Date.parse('2096-03-01T00:00:00Z'),
        Date.parse('2096-03-01T00:00:00Z'),
        'Asia/Shanghai'
      )
    ).toBe(Date.parse('2104-02-29T01:00:00Z'))
  })

  it('rejects invalid timezones instead of silently using the host', () => {
    expect(() => next('0 9 * * *', start, start, 'Invalid/Zone')).toThrow(RangeError)
    expect(() => latest('0 9 * * *', start, start, 'Invalid/Zone')).toThrow(RangeError)
  })

  it('keeps an omitted timezone equivalent to the current local timezone', () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(next('0 9 * * *', start, start)).toBe(next('0 9 * * *', start, start, zone))
  })

  it('respects dtstart, including sub-minute boundaries', () => {
    const dtstart = Date.parse('2026-09-19T09:00:00.001Z')
    expect(next('0 9 * * *', dtstart, dtstart - 1000, 'UTC')).toBe(
      Date.parse('2026-09-20T09:00:00Z')
    )
    expect(latest('0 9 * * *', dtstart, dtstart - 1, 'UTC')).toBeNull()
  })
})
