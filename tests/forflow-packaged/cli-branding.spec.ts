import { test, expect } from '@stablyai/playwright-test'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { evidence, packageFingerprint } from './harness'
import releaseProfile from '../../resources/forflow/release-profile.json'

test('smoke: packaged Forflow CLI has its own identity, help, guides and offline skill installer', async () => {
  const app = process.env.FORFLOW_PACKAGED_APP
  if (!app) {
    throw new Error('FORFLOW_PACKAGED_APP is required')
  }
  const home = mkdtempSync(path.join(tmpdir(), 'forflow-cli-package-'))
  const launcher = path.join(app, 'Contents/Resources/bin/forflow')
  const env = {
    HOME: home,
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
    FORFLOW_USER_DATA_PATH: path.join(home, 'profile'),
    ORCA_BACKGROUND_LAUNCH: '1',
    ORCA_TELEMETRY_DISABLED: '1',
    HTTP_PROXY: 'http://127.0.0.1:1',
    HTTPS_PROXY: 'http://127.0.0.1:1',
    npm_config_registry: 'http://127.0.0.1:1'
  }
  const run = (...args: string[]) =>
    execFileSync(launcher, args, { env, cwd: home, encoding: 'utf8', timeout: 30_000 })
  try {
    expect(run('--version').trim()).toBe(releaseProfile.version)
    const root = run('--help')
    expect(root).toContain('Forflow One 命令行 · forflow')
    expect(root).toContain('FORFLOW_USER_DATA_PATH')
    expect(root).not.toContain('Usage: orca')
    expect(run('worktree', '--help')).toContain('用法： forflow worktree')
    expect(run('terminal', 'split', '--help')).toContain('拆分一个现有终端窗格')
    const schema = JSON.parse(run('agent-context', '--json'))
    expect(schema.commandCount).toBeGreaterThanOrEqual(234)
    for (const command of schema.commands) {
      expect(command.usage).toMatch(/^forflow /)
      expect(command.summary).toMatch(/[\u4e00-\u9fff]/)
    }
    const guides = JSON.parse(run('skills', 'list', '--json'))
    expect(guides.topics.some((topic: { name: string }) => topic.name === 'forflow-cli')).toBe(true)
    const modern = run('skills', 'get', 'forflow-cli', '--json')
    expect(run('skills', 'get', 'orca-cli', '--json')).toBe(modern)
    expect(JSON.parse(modern).markdown).not.toMatch(/\bOrca\b|\borca (?=[a-z])/)
    const plan = JSON.parse(run('skills', 'install', '--all', '--dry-run', '--json'))
    expect(plan).toMatchObject({ mode: 'bundled-offline', executed: false })
    const install = JSON.parse(run('skills', 'install', '--skill', 'forflow-cli', '--json'))
    expect(install).toMatchObject({ executed: true, results: [{ status: 'installed' }] })
    expect(readFileSync(path.join(home, '.agents/skills/orca-cli/SKILL.md'), 'utf8')).toContain(
      'skills get forflow-cli'
    )
    const update = JSON.parse(run('skills', 'update', '--skill', 'forflow-cli', '--json'))
    expect(update).toMatchObject({ results: [{ status: 'unchanged' }] })
    const typo = spawnSync(launcher, ['worktree', 'lis', '--json'], {
      env,
      cwd: home,
      encoding: 'utf8',
      timeout: 30_000
    })
    expect(typo.status).toBe(1)
    expect(JSON.parse(typo.stdout)).toMatchObject({
      ok: false,
      error: { code: 'invalid_argument' }
    })
    expect(typo.stdout).toContain('forflow worktree list')

    // Direct Node-mode execution must keep the packaged identity without wrapper variables.
    const direct = execFileSync(
      path.join(app, 'Contents/MacOS/Forflow One'),
      [path.join(app, 'Contents/Resources/app.asar.unpacked/out/cli/index.js'), '--help'],
      { env: { ...env, ELECTRON_RUN_AS_NODE: '1' }, cwd: home, encoding: 'utf8', timeout: 30_000 }
    )
    expect(direct).toBe(root)
    writeFileSync(
      path.join(evidence, 'cli-branding.json'),
      JSON.stringify(
        {
          packageFingerprint,
          version: releaseProfile.version,
          commandCount: schema.commandCount,
          guideCount: guides.topics.length,
          offlineInstall: install.results,
          directIdentityMatchesWrapper: true,
          legacyGuideAliasMatches: true
        },
        null,
        2
      )
    )
    writeFileSync(path.join(evidence, 'cli-help.txt'), root)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
