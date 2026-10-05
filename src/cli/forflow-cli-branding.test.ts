import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyForflowCliEnvironment, brandCliDocumentation, isForflowCli } from './cli-product'
import { COMMAND_SPECS } from './specs'
import { formatCommandHelp, formatGroupHelp, printHelp } from './help'
import { buildAgentContext } from './agent-context'
import { FORFLOW_COMMAND_SUMMARIES } from './forflow-command-summaries'
import { getDefaultUserDataPath } from './runtime/metadata'
import {
  buildOrchestrationRecoveryCommand,
  resolveOrchestrationCliExecutable
} from './runtime/orchestration-recovery-command'
import { loadCanonicalGuides, requireTopic } from './handlers/bundled-skill-guide-table'
import { formatCliError, reportCliError } from './cli-error'
import { RuntimeClientError, RuntimeRpcFailureError } from './runtime/types'
import { unknownCommandData } from './command-suggestion'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})
function forflow() {
  vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'cn-private')
}

describe('Forflow CLI identity and compatibility', () => {
  it('keeps upstream help unchanged outside a Forflow build', () => {
    vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'upstream')
    vi.stubEnv('FORFLOW_BUILD', '')
    expect(isForflowCli()).toBe(false)
    expect(formatGroupHelp(COMMAND_SPECS, ['worktree'])).toContain('Usage: orca worktree')
  })

  it('covers every command with a Chinese summary and runnable Forflow usage', () => {
    forflow()
    for (const spec of COMMAND_SPECS) {
      expect(FORFLOW_COMMAND_SUMMARIES[spec.path.join(' ')]).toMatch(/[\u4e00-\u9fff]/)
      const help = formatCommandHelp(spec)
      expect(help).toMatch(/^forflow /)
      expect(help).toContain('用法： forflow ')
      expect(help).not.toMatch(/\bOrca\b|\borca (?=[a-z])/)
    }
  })

  it('preserves all command paths, aliases, flags and argument modes in agent discovery', () => {
    const upstream = buildAgentContext(COMMAND_SPECS)
    forflow()
    const branded = buildAgentContext(COMMAND_SPECS)
    expect(branded.schemaVersion).toBe(upstream.schemaVersion)
    expect(branded.commandCount).toBe(upstream.commandCount)
    for (const [index, command] of branded.commands.entries()) {
      const { summary: _s, usage: _u, notes: _n, examples: _e, ...machine } = command
      const {
        summary: _s2,
        usage: _u2,
        notes: _n2,
        examples: _e2,
        ...before
      } = upstream.commands[index]
      expect(machine).toEqual(before)
      expect(command.usage).toMatch(/^forflow /)
    }
  })

  it('root help retains every visible command and explains routing and environment aliases', () => {
    forflow()
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    printHelp(COMMAND_SPECS)
    const output = log.mock.calls.flat().join('\n')
    for (const spec of COMMAND_SPECS.filter((spec) => !spec.hidden)) {
      expect(output).toContain(spec.path.join(' '))
    }
    expect(output).toContain('FORFLOW_USER_DATA_PATH')
    expect(output).toContain('orca://pair')
    expect(output).toContain('Kimi、智谱和 DeepSeek')
  })

  it('keeps URLs, protocol and environment identifiers in authored technical documentation', () => {
    forflow()
    expect(
      brandCliDocumentation(
        'Orca: `orca status`; ORCA status; ORCA_PANE_KEY; orca://pair; https://onorca.dev/docs'
      )
    ).toBe(
      'Forflow One: `forflow status`; FORFLOW status; ORCA_PANE_KEY; orca://pair; https://onorca.dev/docs'
    )
  })

  it('maps only declared environment aliases, preferring explicit Forflow configuration', () => {
    const env = {
      FORFLOW_DEPLOYMENT_PROFILE: 'cn-private',
      FORFLOW_USER_DATA_PATH: '/my/orca data',
      ORCA_USER_DATA_PATH: '/old',
      ORCA_PANE_KEY: 'unchanged'
    }
    applyForflowCliEnvironment(env)
    expect(env.ORCA_USER_DATA_PATH).toBe('/my/orca data')
    expect(env.ORCA_PANE_KEY).toBe('unchanged')
  })

  it.each(['darwin', 'linux', 'win32'] as const)(
    'uses a separate data directory on %s',
    (platform) => {
      forflow()
      vi.stubEnv('ORCA_USER_DATA_PATH', '')
      vi.stubEnv('FORFLOW_USER_DATA_PATH', '')
      vi.stubEnv('APPDATA', '/fixture/appdata')
      vi.stubEnv('XDG_CONFIG_HOME', '/fixture/config')
      expect(getDefaultUserDataPath(platform, '/fixture/home')).toMatch(/Forflow One$/)
      vi.stubEnv('FORFLOW_USER_DATA_PATH', '/fixture/explicit')
      expect(getDefaultUserDataPath(platform, '/fixture/home')).toBe('/fixture/explicit')
    }
  )

  it('builds Forflow retry argv without rewriting user-owned values', () => {
    const env = { FORFLOW_DEPLOYMENT_PROFILE: 'cn-private' }
    expect(resolveOrchestrationCliExecutable(env, 'linux')).toBe('forflow')
    forflow()
    const args = buildOrchestrationRecoveryCommand('orchestration.workerStart', {
      task: 'orca-task',
      worktree: 'path:/orca project'
    })
    expect(args).toEqual([
      'forflow',
      'orchestration',
      'worker-start',
      '--task',
      'orca-task',
      '--worktree',
      'path:/orca project'
    ])
    expect(
      resolveOrchestrationCliExecutable({ ...env, FORFLOW_CLI_COMMAND: '/custom/forflow' })
    ).toBe('/custom/forflow')
  })

  it('suggests the new executable when a command is mistyped', () => {
    forflow()
    expect(unknownCommandData(COMMAND_SPECS, ['worktree', 'lis']).nextSteps.join(' ')).toContain(
      'forflow worktree list'
    )
  })

  it('does not rewrite user errors or remote JSON payloads', () => {
    forflow()
    const message = 'user project: Orca /home/orca/readme orca status'
    expect(formatCliError(new Error(message))).toBe(message)
    expect(formatCliError(new RuntimeClientError('runtime_unavailable', message))).toContain(
      'forflow open'
    )
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const response = {
      id: 'test',
      ok: false as const,
      error: { code: 'runtime_error', message, data: { path: '/orca', nextSteps: ['user data'] } },
      _meta: { runtimeId: null }
    }
    reportCliError(new RuntimeRpcFailureError(response), true)
    expect(JSON.parse(String(log.mock.calls[0][0]))).toEqual(response)
  })

  it('serves branded guides under both new and legacy topic names without losing references', async () => {
    const original = await loadCanonicalGuides()
    forflow()
    const guides = await loadCanonicalGuides()
    expect(guides).toHaveLength(original.length)
    const modern = requireTopic(new Map([['topic', 'forflow-cli']]), guides)
    expect(requireTopic(new Map([['topic', 'orca-cli']]), guides)).toBe(modern)
    expect(modern.markdown).not.toMatch(/\bOrca\b|\borca (?=[a-z])/)
    expect(modern.markdown).toContain('FORFLOW')
    expect(modern.references.map((r) => r.name)).toEqual(
      original.find((g) => g.name === 'orca-cli')?.references.map((r) => r.name)
    )
  })
})
