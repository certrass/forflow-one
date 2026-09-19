const DAY_MS = 24 * 60 * 60 * 1000

export function createAutomationZonedCalendar(timezone?: string): {
  wallTime: (timestamp: number) => number
  instantsOnDay: (day: number, hours: number[], minutes: number[]) => number[]
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  })
  const wallTime = (timestamp: number): number => {
    const parts = formatter.formatToParts(timestamp)
    const value = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((part) => part.type === type)?.value)
    return Date.UTC(
      value('year'),
      value('month') - 1,
      value('day'),
      value('hour'),
      value('minute'),
      value('second')
    )
  }
  const instantsOnDay = (day: number, hours: number[], minutes: number[]): number[] => {
    // Sample both sides of the local day so a DST fold keeps both offsets.
    const offsets = new Set(
      [-1.5, 0, 1.5].map((days) => {
        const probe = day + days * DAY_MS
        return wallTime(probe) - probe
      })
    )
    const candidates: number[] = []
    for (const hour of hours) {
      for (const minute of minutes) {
        const wall = day + hour * 60 * 60 * 1000 + minute * 60 * 1000
        for (const offset of offsets) {
          const instant = wall - offset
          // Round-trip rejects nonexistent spring-forward wall times.
          if (wallTime(instant) === wall) {
            candidates.push(instant)
          }
        }
      }
    }
    return candidates.sort((left, right) => left - right)
  }
  return { wallTime, instantsOnDay }
}
