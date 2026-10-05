import { describe, expect, it } from 'vitest'
import { codexAutomationSchedule, codexAutomationStatus } from './codex-automation-display'

describe('Codex schedule descriptions', () => {
  it('accepts RRULE prefixes without changing the scheduled clock time', () => {
    expect(codexAutomationSchedule('RRULE:FREQ=DAILY;BYHOUR=9;BYMINUTE=30')).toBe(
      codexAutomationSchedule('FREQ=DAILY;BYHOUR=9;BYMINUTE=30')
    )
  })
  it('recognizes all seven weekdays without labelling a valid Codex plan invalid', () => {
    expect(
      codexAutomationSchedule('RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA;BYHOUR=9;BYMINUTE=30')
    ).toBe(codexAutomationSchedule('FREQ=DAILY;BYHOUR=9;BYMINUTE=30'))
  })
  it.each([
    'FREQ=HOURLY;INTERVAL=2;BYMINUTE=0',
    'FREQ=HOURLY;BYMINUTE=0,30;BYSECOND=0',
    'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;COUNT=3',
    'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;UNTIL=20261001T000000Z',
    'FREQ=DAILY;BYHOUR=9',
    'FREQ=HOURLY;BYHOUR=9;BYMINUTE=0',
    'FREQ=DAILY;BYDAY=MO;BYHOUR=9;BYMINUTE=0',
    'FREQ=WEEKLY;BYHOUR=9;BYMINUTE=0',
    'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;BYMINUTE=30'
  ])('retains custom semantics for %s', (rule) => {
    expect(codexAutomationSchedule(rule)).toBe('自定义计划（见任务详情）')
  })
  it('never treats enabled as currently running or unknown as enabled', () => {
    expect(codexAutomationStatus('ACTIVE')).toBe('已启用')
    expect(codexAutomationStatus('PAUSED')).toBe('已暂停')
    expect(codexAutomationStatus('FUTURE')).toBe('未知状态：FUTURE')
  })
})
