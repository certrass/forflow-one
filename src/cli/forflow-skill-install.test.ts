import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CommandHandler } from './dispatch'
import { SKILL_HANDLERS } from './handlers/skills'

vi.mock('./cli-version', () => ({ readOrcaCliVersion: () => 'test.12' }))
vi.mock('./stdout-line', () => ({ writeStdoutLine: vi.fn() }))
import { writeStdoutLine } from './stdout-line'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'forflow-cli-skills-'))
  vi.stubEnv('HOME', root)
  vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'cn-private')
  vi.stubEnv('FORFLOW_USER_DATA_PATH', join(root, 'state'))
  vi.stubEnv('ORCA_CLI_CWD', '')
  vi.stubEnv('ORCA_CLI_COMMAND', 'forflow')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  process.exitCode = 0
})

function context(flags: [string, string | boolean][] = []): Parameters<CommandHandler>[0] {
  return {
    flags: new Map(flags),
    json: true,
    cwd: join(root, 'project'),
    get client(): never {
      throw new Error('offline commands must not contact a runtime')
    }
  }
}
function output(): unknown {
  return JSON.parse(String(vi.mocked(writeStdoutLine).mock.calls.at(-1)?.[0]))
}

describe('Forflow CLI bundled offline skills', () => {
  it('keeps diagnostics off the JSON output stream', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    await SKILL_HANDLERS['skills install'](context([['skill', 'forflow-cli']]))
    expect(info).not.toHaveBeenCalled()
    expect(stderr.mock.calls.map(([line]) => String(line)).join('')).toContain('[skills] scan')
    expect(output()).toMatchObject({ executed: true })
  })

  it('accepts both topic names, installs without a runtime and does not duplicate directories', async () => {
    await SKILL_HANDLERS['skills install'](context([['skill', 'forflow-cli']]))
    expect(output()).toMatchObject({
      mode: 'bundled-offline',
      executed: true,
      skills: ['forflow-cli'],
      results: [{ status: 'installed' }]
    })
    const file = join(root, '.agents/skills/orca-cli/SKILL.md')
    expect(await readFile(file, 'utf8')).toContain('skills get forflow-cli')
    await SKILL_HANDLERS['skills install'](context([['skill', 'orca-cli']]))
    expect(output()).toMatchObject({ results: [{ status: 'unchanged' }] })
    expect(await readdir(join(root, '.agents/skills'))).toEqual(['orca-cli'])
  })

  it('places explicitly selected Claude and Codex skills without downloading code', async () => {
    await SKILL_HANDLERS['skills install'](
      context([
        ['skill', 'forflow-cli'],
        ['agent', 'claude-code,codex']
      ])
    )
    expect(output()).toMatchObject({
      providers: ['claude', 'codex'],
      results: [{ status: 'installed' }]
    })
    expect(await readFile(join(root, '.claude/skills/orca-cli/SKILL.md'), 'utf8')).toContain(
      'skills get forflow-cli'
    )
  })

  it('does not create files during a dry run', async () => {
    await SKILL_HANDLERS['skills install'](
      context([
        ['all', true],
        ['dry-run', true]
      ])
    )
    expect(output()).toMatchObject({ executed: false, global: true, mode: 'bundled-offline' })
    expect(await readdir(root)).toEqual([])
  })

  it('supports local project installs and preserves edited skills on update', async () => {
    await SKILL_HANDLERS['skills install'](
      context([
        ['skill', 'forflow-cli'],
        ['local', true]
      ])
    )
    const file = join(root, 'project/.agents/skills/orca-cli/SKILL.md')
    const modified = `${await readFile(file, 'utf8')}\n用户的修改\n`
    await writeFile(file, modified)
    await SKILL_HANDLERS['skills update'](
      context([
        ['skill', 'forflow-cli'],
        ['local', true]
      ])
    )
    expect(output()).toMatchObject({ results: [{ status: 'conflict' }] })
    expect(process.exitCode).toBe(1)
    expect(await readFile(file, 'utf8')).toBe(modified)
  })

  it('does not install missing skills during update', async () => {
    await SKILL_HANDLERS['skills update'](context([['all', true]]))
    expect(output()).toMatchObject({ executed: false, skills: [] })
    expect(await readdir(root)).toEqual([])
  })

  it('refuses forwarded SSH installation before any writes', async () => {
    vi.stubEnv('ORCA_CLI_CWD', '/remote/project')
    await expect(SKILL_HANDLERS['skills install'](context([['all', true]]))).rejects.toMatchObject({
      code: 'invalid_environment'
    })
    expect(await readdir(root)).toEqual([])
  })

  it('rejects unsupported provider placement and traversal instead of silently ignoring them', async () => {
    await expect(
      SKILL_HANDLERS['skills install'](
        context([
          ['skill', 'forflow-cli'],
          ['agent', 'unsupported-agent']
        ])
      )
    ).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(
      SKILL_HANDLERS['skills install'](context([['skill', '../../invalid']]))
    ).rejects.toMatchObject({ code: 'invalid_argument' })
    expect(await readdir(root)).toEqual([])
  })
})
