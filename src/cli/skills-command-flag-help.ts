import { isForflowCli } from './cli-product'
/** Per-flag help for the skills commands, kept out of the shared help chain it would crowd. */
const SKILLS_FLAG_HELP: Record<string, Record<string, string>> = {
  'skills get': {
    full: '--full                 Print the full guide with bundled references',
    reference: '--reference <name>     Print one bundled reference by name',
    references: '--references           List the bundled reference names for a topic'
  },
  'skills install': {
    agent: '--agent <names>        Comma-separated install targets; default is detected agents'
  }
}

export function formatSkillsCommandFlagHelp(command: string, flag: string): string | undefined {
  if (isForflowCli() && command === 'skills install' && flag === 'agent') {
    return '--agent <names>        逗号分隔的安装目标，如 claude-code,codex；默认 universal'
  }
  return SKILLS_FLAG_HELP[command]?.[flag]
}
