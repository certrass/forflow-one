import type { CodexAutomationIssue } from '../../../../shared/codex-automations'
import { formatUiAutomationSchedule } from './automation-schedule-label'
import { tryParseAutomationRrule } from '../../../../shared/automation-schedule-parsing'

export function codexAutomationStatus(status: string): string {
  if (status === 'ACTIVE') {
    return '已启用'
  }
  if (status === 'PAUSED') {
    return '已暂停'
  }
  return `未知状态：${status}`
}

export function codexAutomationSchedule(rrule: string): string {
  const rule = rrule.replace(/^RRULE:/, '')
  const parts = rule.split(';')
  const fields = new Map(
    parts.map((part) => {
      const [key, value] = part.split('=')
      return [key, value] as const
    })
  )
  const supported = parts.every((part) =>
    /^(FREQ=(HOURLY|DAILY|WEEKLY)|BYHOUR=\d{1,2}|BYMINUTE=\d{1,2}|BYDAY=(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*|INTERVAL=1|BYSECOND=0)$/.test(
      part
    )
  )
  if (
    !supported ||
    fields.size !== parts.length ||
    !fields.has('FREQ') ||
    !fields.has('BYMINUTE') ||
    (fields.get('FREQ') !== 'HOURLY' && !fields.has('BYHOUR')) ||
    (fields.get('FREQ') === 'WEEKLY' && !fields.has('BYDAY')) ||
    (fields.get('FREQ') !== 'WEEKLY' && fields.has('BYDAY')) ||
    (fields.get('FREQ') === 'HOURLY' && fields.has('BYHOUR'))
  ) {
    return '自定义计划（见任务详情）'
  }
  const days = fields.get('BYDAY')?.split(',').sort().join(',')
  const normalized =
    days === 'FR,MO,SA,SU,TH,TU,WE'
      ? rule.replace('FREQ=WEEKLY', 'FREQ=DAILY').replace(/;BYDAY=[A-Z,]+/, '')
      : days === 'FR,MO,TH,TU,WE'
        ? rule.replace(/BYDAY=[A-Z,]+/, 'BYDAY=MO,TU,WE,TH,FR')
        : rule
  return tryParseAutomationRrule(normalized)
    ? formatUiAutomationSchedule(normalized)
    : '自定义计划（见任务详情）'
}

export const CODEX_AUTOMATION_ISSUES: Record<CodexAutomationIssue['code'], string> = {
  permission: '没有读取权限，请检查该目录或文件的权限后重试。',
  invalid: '配置格式无法识别，请在 Codex 中检查；CODEX_HOME 必须为绝对路径。',
  version: '此任务使用尚未支持的配置版本，请在 Codex 中查看。',
  oversized: '配置文件超过 256 KB，本次未读取。',
  unreadable: '文件无法读取，请检查文件是否存在且为普通文件。',
  limit: '任务数量或内容超过读取上限，本次仅显示部分结果。'
}
