import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function isPackagedForflowCli(): boolean {
  try {
    const metadata: unknown = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
    )
    return (
      typeof metadata === 'object' &&
      metadata !== null &&
      'name' in metadata &&
      metadata.name === 'forflow-one-compiled-output'
    )
  } catch {
    return false
  }
}

const packagedForflow = isPackagedForflowCli()

export function isForflowCli(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    packagedForflow || env.FORFLOW_DEPLOYMENT_PROFILE === 'cn-private' || env.FORFLOW_BUILD === '1'
  )
}

export function cliCommandName(): string {
  return isForflowCli() ? 'forflow' : 'orca'
}

export function cliProductName(): string {
  return isForflowCli() ? 'Forflow One' : 'Orca'
}

// Only authored documentation may pass here; never terminal output, paths or RPC payloads.
export function brandCliDocumentation(text: string): string {
  if (!isForflowCli()) return text
  return text
    .replace(/\bOrca\b/g, 'Forflow One')
    .replace(/\borca(?=\s|`|$)/g, 'forflow')
    .replace(/\bORCA(?=\s|`|$)/g, 'FORFLOW')
}

export const FORFLOW_CLI_ENV_ALIASES = [
  'USER_DATA_PATH',
  'APP_EXECUTABLE',
  'OPEN_COMMAND',
  'CLI_COMMAND',
  'CLI_CWD',
  'ENVIRONMENT',
  'PAIRING_CODE'
] as const

export function applyForflowCliEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (!isForflowCli(env)) return
  for (const suffix of FORFLOW_CLI_ENV_ALIASES) {
    const value = env[`FORFLOW_${suffix}`]
    if (value !== undefined) env[`ORCA_${suffix}`] = value
  }
  env.ORCA_CLI_COMMAND ??= 'forflow'
}
