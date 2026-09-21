import { describe, expect, it } from 'vitest'
import { buildCodexUsageChart } from './codex-usage-chart-series'

const point = (day: string) => ({
  day,
  inputTokens: 100,
  cachedInputTokens: 80,
  outputTokens: 20,
  reasoningOutputTokens: 15,
  totalTokens: 120
})
const now = new Date(2026, 8, 21, 12)

describe('Codex usage chart', () => {
  it('preserves provider totals when its bucket accounting differs from Codex', () => {
    const chart = buildCodexUsageChart(
      [{ ...point('2026-09-21'), totalTokens: 155 }],
      '7d',
      now,
      true
    )
    expect(chart.at(-1)?.total).toBe(155)
  })
  it('counts cached input and reasoning only once and preserves empty calendar days', () => {
    const chart = buildCodexUsageChart([point('2026-09-18')], '7d', now)
    expect(chart).toHaveLength(7)
    expect(chart[0].start).toBe('2026-09-15')
    expect(chart[6].end).toBe('2026-09-21')
    expect(chart[3]).toEqual({
      start: '2026-09-18',
      end: '2026-09-18',
      input: 20,
      cached: 80,
      output: 20,
      total: 120
    })
    expect(chart.filter((row) => row.total === 0)).toHaveLength(6)
  })
  it('uses the selected calendar period and excludes future records', () => {
    const daily = ['2026-08-23', '2026-09-01', '2026-09-21', '2026-09-22'].map(point)
    expect(buildCodexUsageChart(daily, '7d', now).reduce((sum, row) => sum + row.total, 0)).toBe(
      120
    )
    expect(buildCodexUsageChart(daily, '30d', now).reduce((sum, row) => sum + row.total, 0)).toBe(
      360
    )
  })
  it('buckets long histories without discarding tokens or rendering unbounded columns', () => {
    const daily = [point('2024-01-01'), point('2025-07-30'), point('2026-09-21')]
    const chart = buildCodexUsageChart(daily, 'all', now)
    expect(chart.length).toBeLessThanOrEqual(60)
    expect(chart[0].start).toBe('2024-01-01')
    expect(chart.at(-1)?.end).toBe('2026-09-21')
    expect(chart.reduce((sum, row) => sum + row.total, 0)).toBe(360)
  })
})
