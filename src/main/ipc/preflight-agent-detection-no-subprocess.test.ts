/* Regression pin for #9297: local agent detection must resolve executables
 * against PATH with fs and spawn ZERO where/which subprocesses. On unfixed
 * code this fails because detectInstalledAgents spawns one `where`/`which`
 * process per probe command (>=20). See the read-only repro in comment-scan:
 * repro-9297-where-per-agent-probe.test.ts (which pins the OLD, buggy count).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const runWslProcessMock = vi.hoisted(() => vi.fn())
vi.mock('../wsl/wsl-runner', () => ({ runWslProcess: runWslProcessMock }))

const {
  handleMock,
  execFileMock,
  spawnMock,
  execFileAsyncMock,
  hydrateShellPathMock,
  mergePathSegmentsMock,
  getActiveMultiplexerMock,
  getBitbucketAuthStatusMock,
  getAzureDevOpsAuthStatusMock,
  getGiteaAuthStatusMock,
  detectCommandsInInstallDirsMock,
  mergePersistedWindowsPathAsyncMock,
  mergePersistedWindowsPathMock
} = vi.hoisted(() => ({
  handleMock: vi.fn(),
  execFileMock: vi.fn(),
  spawnMock: vi.fn(),
  execFileAsyncMock: vi.fn(),
  hydrateShellPathMock: vi.fn(),
  mergePathSegmentsMock: vi.fn(),
  getActiveMultiplexerMock: vi.fn(),
  getBitbucketAuthStatusMock: vi.fn(),
  getAzureDevOpsAuthStatusMock: vi.fn(),
  getGiteaAuthStatusMock: vi.fn(),
  detectCommandsInInstallDirsMock: vi.fn(),
  mergePersistedWindowsPathAsyncMock: vi.fn(),
  mergePersistedWindowsPathMock: vi.fn()
}))

vi.mock('electron', () => ({ ipcMain: { handle: handleMock } }))

vi.mock('child_process', () => {
  const execFileWithPromisify = Object.assign(execFileMock, {
    [Symbol.for('nodejs.util.promisify.custom')]: execFileAsyncMock
  })
  return { execFile: execFileWithPromisify, spawn: spawnMock }
})

vi.mock('../startup/hydrate-shell-path', () => ({
  hydrateShellPath: hydrateShellPathMock,
  mergePathSegments: mergePathSegmentsMock
}))

vi.mock('./ssh', () => ({ getActiveMultiplexer: getActiveMultiplexerMock }))
vi.mock('../bitbucket/client', () => ({ getBitbucketAuthStatus: getBitbucketAuthStatusMock }))
vi.mock('../azure-devops/client', () => ({
  getAzureDevOpsAuthStatus: getAzureDevOpsAuthStatusMock
}))
vi.mock('../gitea/client', () => ({ getGiteaAuthStatus: getGiteaAuthStatusMock }))

// Isolate the subprocess-spawn assertion from the fs-based install-dir fallback.
vi.mock('./local-agent-install-dir-detection', () => ({
  detectCommandsInInstallDirs: detectCommandsInInstallDirsMock
}))

// Win32 preflight env merge reads persisted registry PATH; stub it out.
vi.mock('../pty/windows-environment-path', () => ({
  mergePersistedWindowsPathAsync: mergePersistedWindowsPathAsyncMock,
  mergePersistedWindowsPath: mergePersistedWindowsPathMock
}))

import { _resetPreflightCache, detectInstalledAgents } from './preflight'
import {
  getTuiAgentDetectionProbeCommands,
  KNOWN_TUI_AGENT_DETECTION_COMMANDS
} from './tui-agent-detection-commands'

describe('#9297: local agent detection spawns zero where/which subprocesses', () => {
  const originalPlatform = process.platform
  const originalPath = process.env.PATH
  let fixtureDirectory: string | undefined

  beforeEach(() => {
    execFileAsyncMock.mockReset()
    execFileMock.mockReset()
    spawnMock.mockReset()
    // Any spawn attempt is the bug; make it explode so a regression is loud.
    execFileAsyncMock.mockImplementation(async (command: string) => {
      throw new Error(`unexpected subprocess spawn: ${command}`)
    })
    detectCommandsInInstallDirsMock.mockReset()
    detectCommandsInInstallDirsMock.mockReturnValue(new Set<string>())
    // Empty PATH -> deterministic "no agents found" regardless of the host's
    // real installed CLIs, so the assertion is stable on any dev machine.
    process.env.PATH = ''
    _resetPreflightCache()
    runWslProcessMock.mockReset()
  })

  afterEach(async () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: originalPlatform })
    process.env.PATH = originalPath
    if (fixtureDirectory) {
      await rm(fixtureDirectory, { recursive: true, force: true })
      fixtureDirectory = undefined
    }
  })

  it('detects a quoted Chinese custom executable without running it or its arguments', async () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'darwin' })
    fixtureDirectory = await mkdtemp(join(tmpdir(), 'agent-override-'))
    const executable = join(fixtureDirectory, '智能 助手')
    await writeFile(executable, '#!/bin/sh\nexit 99\n', { mode: 0o755 })
    const agents = await detectInstalledAgents(undefined, {
      codex: `"${executable}" --profile work; false`
    })
    expect(agents).toContain('codex')
    expect(execFileAsyncMock).not.toHaveBeenCalled()
    expect(execFileMock).not.toHaveBeenCalled()
    expect(spawnMock).not.toHaveBeenCalled()
    expect(runWslProcessMock).not.toHaveBeenCalled()
  })

  it('does not fall back to installed defaults for stale, blank, directory or non-executable overrides', async () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'darwin' })
    fixtureDirectory = await mkdtemp(join(tmpdir(), 'agent-override-'))
    await writeFile(join(fixtureDirectory, 'codex'), '#!/bin/sh\nexit 99\n', { mode: 0o755 })
    process.env.PATH = fixtureDirectory
    const notExecutable = join(fixtureDirectory, 'not-executable')
    await writeFile(notExecutable, 'not executable')
    await chmod(notExecutable, 0o644)
    const directory = join(fixtureDirectory, 'directory')
    await mkdir(directory)
    expect(await detectInstalledAgents()).toContain('codex')
    for (const override of [
      '',
      '  ',
      join(fixtureDirectory, 'missing'),
      notExecutable,
      directory
    ]) {
      expect(await detectInstalledAgents(undefined, { codex: override })).not.toContain('codex')
    }
    expect(execFileAsyncMock).not.toHaveBeenCalled()
    expect(execFileMock).not.toHaveBeenCalled()
    expect(spawnMock).not.toHaveBeenCalled()
  })

  it('replaces WSL probes with the POSIX custom token and never probes the native PATH', async () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' })
    const executable = '/home/test/智能 助手'
    runWslProcessMock.mockResolvedValue({
      stdout: `__ORCA_AGENT_PATH__${executable}\t${executable}\n`,
      code: 0,
      timedOut: false
    })
    const agents = await detectInstalledAgents(
      { wslDistro: 'Ubuntu' },
      {
        codex: '"/home/test/智能 助手" --profile test; touch /tmp/must-not-run'
      }
    )
    expect(agents).toContain('codex')
    expect(runWslProcessMock).toHaveBeenCalledWith(expect.objectContaining({ distro: 'Ubuntu' }))
    const script = runWslProcessMock.mock.calls[0][0].script
    expect(script).toContain("'/home/test/智能 助手'")
    expect(script).not.toContain("'codex'")
    expect(script).not.toContain('must-not-run')
    expect(detectCommandsInInstallDirsMock).not.toHaveBeenCalled()
    expect(execFileAsyncMock).not.toHaveBeenCalled()
    runWslProcessMock.mockResolvedValue({
      stdout: '__ORCA_AGENT_PATH__codex\t/usr/bin/codex\n',
      code: 0,
      timedOut: false
    })
    expect(
      await detectInstalledAgents({ wslDistro: 'Ubuntu' }, { codex: '/missing/custom' })
    ).not.toContain('codex')
  })

  for (const platform of ['win32', 'darwin'] as const) {
    it(`resolves via fs (no where/which spawn) on ${platform}`, async () => {
      Object.defineProperty(process, 'platform', { configurable: true, value: platform })

      const probeCommands = getTuiAgentDetectionProbeCommands(
        KNOWN_TUI_AGENT_DETECTION_COMMANDS,
        platform
      )
      // Guardrail: the candidate list is large, so the old one-spawn-per-probe
      // path multiplied a gated where.exe across dozens of startups.
      expect(probeCommands.length).toBeGreaterThanOrEqual(20)

      const agents = await detectInstalledAgents()

      // Perf-win lock: before the fix this was probeCommands.length (>=20);
      // after the fix it is exactly 0.
      expect(execFileAsyncMock).toHaveBeenCalledTimes(0)
      // Behavior preserved: empty PATH resolves nothing.
      expect(agents).toEqual([])
    })
  }
})
