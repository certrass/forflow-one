import { SKILL_INSTALL_PROVIDERS } from '../../shared/skill-install-providers'
import { SKILLS_CLI_AGENT_KEY_BY_TUI_AGENT } from '../../shared/skills-cli-agent-keys'
import { lstat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { installForflowBundledSkills } from '../../main/forflow/bundled-skill-install'
import { canonicalForflowSkillName, forflowSkillName } from '../../shared/forflow-bundled-skills'
import { readOrcaCliVersion } from '../cli-version'
import type { CommandHandler } from '../dispatch'
import { getDefaultUserDataPath } from '../runtime/metadata'
import { getMacAppBundlePath } from '../runtime/mac-app-update-bundle'
import { RuntimeClientError } from '../runtime/types'
import { writeStdoutLine } from '../stdout-line'

export async function installForflowCliSkills(
  verb: 'install' | 'update',
  names: string[],
  { flags, cwd, json }: Parameters<CommandHandler>[0]
): Promise<void> {
  const rawAgent = flags.get('agent')
  const keys =
    rawAgent === undefined
      ? ['universal']
      : typeof rawAgent === 'string'
        ? rawAgent.split(',').map((key) => key.trim())
        : []
  const providers: string[] = []
  for (const key of keys) {
    if (key === 'universal') {
      continue
    }
    const provider = SKILL_INSTALL_PROVIDERS.find(
      (provider) => provider.id === key || SKILLS_CLI_AGENT_KEY_BY_TUI_AGENT[provider.id] === key
    )
    if (!provider) {
      throw new RuntimeClientError(
        'invalid_argument',
        `离线安装不支持目标 ${key}。可用目标：universal、${SKILL_INSTALL_PROVIDERS.map((provider) => provider.id).join('、')}。`
      )
    }
    providers.push(provider.id)
  }
  if (!keys.length) {
    throw new RuntimeClientError('invalid_argument', '--agent 缺少目标。')
  }
  const global = flags.get('local') !== true
  const directory = global ? homedir() : cwd
  const selected: string[] = []
  for (const requested of names) {
    const name = canonicalForflowSkillName(requested)
    if (verb === 'update') {
      try {
        await lstat(join(directory, '.agents', 'skills', name))
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          continue
        }
        throw error
      }
    }
    selected.push(name)
  }
  const plan = {
    mode: 'bundled-offline',
    providers,
    global,
    executed: false,
    skills: selected.map(forflowSkillName),
    paths: selected.map((name) => join(directory, '.agents', 'skills', name))
  }
  if (flags.get('dry-run') === true || selected.length === 0) {
    writeStdoutLine(
      json
        ? JSON.stringify(plan, null, 2)
        : selected.length
          ? `将从安装包离线${verb === 'install' ? '安装' : '更新'}：\n${plan.paths.join('\n')}\n去掉 --dry-run 后执行。`
          : '没有可更新的已安装技能。请先执行 forflow skills install。'
    )
    return
  }
  const version = readOrcaCliVersion()
  if (!version) {
    throw new RuntimeClientError('invalid_environment', '无法读取 Forflow One 版本，未安装技能。')
  }
  const bundle = process.platform === 'darwin' ? getMacAppBundlePath(process.execPath) : null
  const results = await installForflowBundledSkills({
    names: selected,
    discoveryLog: (message) => {
      process.stderr.write(`${message}\n`)
    },
    providers,
    homeDirectory: homedir(),
    stateDirectory: getDefaultUserDataPath(),
    workspaceDirectory: global ? undefined : cwd,
    version,
    launcherPath: bundle
      ? join(bundle, 'Contents', 'Resources', 'bin', 'forflow')
      : process.env.FORFLOW_CLI_COMMAND || process.env.ORCA_CLI_COMMAND || 'forflow'
  })
  const statuses: Record<string, string> = {
    installed: '已安装',
    updated: '已更新',
    unchanged: '无需更新',
    conflict: '存在本地修改，已保留'
  }
  writeStdoutLine(
    json
      ? JSON.stringify({ ...plan, executed: true, results }, null, 2)
      : results
          .map(
            (result) =>
              `${forflowSkillName(result.name)}：${statuses[result.status] ?? result.status}${result.path ? ` (${result.path})` : ''}`
          )
          .join('\n')
  )
  if (results.some((result) => !['installed', 'updated', 'unchanged'].includes(result.status))) {
    process.exitCode = 1
  }
}
