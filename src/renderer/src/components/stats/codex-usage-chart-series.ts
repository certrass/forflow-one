import type { CodexUsageDailyPoint, CodexUsageRange } from '../../../../shared/codex-usage-types'

export type CodexChartPoint = {
  start: string
  end: string
  input: number
  cached: number
  output: number
  total: number
}
const DAY = 86_400_000
function dayNumber(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) / DAY
}
function dayLabel(day: number): string {
  return new Date(day * DAY).toISOString().slice(0, 10)
}

export function buildCodexUsageChart(
  daily: CodexUsageDailyPoint[],
  range: CodexUsageRange,
  now = new Date(),
  reportedTotals = false
): CodexChartPoint[] {
  const end = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY
  const span = range === '7d' ? 7 : range === '30d' ? 30 : 90
  let start = end - span + 1
  if (range === 'all') {
    start = end - 6
    for (const row of daily) {
      const day = dayNumber(row.day)
      if (Number.isFinite(day)) {
        start = Math.min(start, day)
      }
    }
  }
  const width = Math.max(1, Math.ceil((end - start + 1) / 60))
  const points: CodexChartPoint[] = []
  for (let day = start; day <= end; day += width) {
    points.push({
      start: dayLabel(day),
      end: dayLabel(Math.min(end, day + width - 1)),
      input: 0,
      cached: 0,
      output: 0,
      total: 0
    })
  }
  for (const row of daily) {
    const day = dayNumber(row.day)
    if (!Number.isFinite(day) || day < start || day > end) {
      continue
    }
    const point = points[Math.floor((day - start) / width)]
    // Cached input and reasoning are subsets, not additional tokens.
    const cached = Math.max(0, Math.min(row.cachedInputTokens, row.inputTokens))
    const input = Math.max(0, row.inputTokens - cached)
    const output = Math.max(0, row.outputTokens)
    point.input += input
    point.cached += cached
    point.output += output
    point.total += reportedTotals ? Math.max(0, row.totalTokens) : input + cached + output
  }
  return points
}
