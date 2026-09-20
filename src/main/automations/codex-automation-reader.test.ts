import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stringify } from 'smol-toml'
import { readCodexAutomations } from './codex-automation-reader'

let home: string
const definition = (id: string) => ({
  version: 1,
  id,
  name: '资料复核',
  prompt: '第一行\n保留 "引号"、路径 C:\\work 和中文',
  status: 'ACTIVE',
  rrule: 'RRULE:FREQ=DAILY;BYHOUR=9;BYMINUTE=30',
  cwds: ['/repo'],
  updated_at: 100
})
async function writeDefinition(id: string, content = stringify(definition(id))): Promise<string> {
  const dir = join(home, 'automations', id)
  await mkdir(dir, { recursive: true })
  const file = join(dir, 'automation.toml')
  await writeFile(file, content)
  return file
}
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'codex-automations-'))
})
afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(home, { recursive: true, force: true })
})

describe('Codex local automation definitions', () => {
  it('reads legacy cron and heartbeat without changing files or losing multiline prompts', async () => {
    const file = await writeDefinition('cron')
    await writeDefinition(
      'follow',
      stringify({
        ...definition('follow'),
        kind: 'heartbeat',
        status: 'PAUSED',
        target_thread_id: 'thread-1',
        updated_at: 200
      })
    )
    const before = await readFile(file, 'utf8')
    const result = await readCodexAutomations(home)
    expect(result.status).toBe('ready')
    expect(result.automations.map((a) => [a.id, a.kind, a.status])).toEqual([
      ['follow', 'heartbeat', 'PAUSED'],
      ['cron', 'cron', 'ACTIVE']
    ])
    expect(result.automations[0].targetThreadId).toBe('thread-1')
    expect(result.automations[1].prompt).toBe(definition('cron').prompt)
    expect(await readFile(file, 'utf8')).toBe(before)
  })
  it('honors CODEX_HOME without conflating it with managed CLI account homes', async () => {
    await writeDefinition('cron')
    vi.stubEnv('CODEX_HOME', home)
    expect((await readCodexAutomations()).automations).toHaveLength(1)
  })
  it('distinguishes a missing root, an empty root, and a non-directory root', async () => {
    expect((await readCodexAutomations(home)).status).toBe('missing')
    await mkdir(join(home, 'automations'))
    expect((await readCodexAutomations(home)).status).toBe('ready')
    await rm(join(home, 'automations'), { recursive: true })
    await writeFile(join(home, 'automations'), 'not a directory')
    expect((await readCodexAutomations(home)).status).toBe('error')
  })
  it('rejects relative homes instead of reading whichever workspace is active', async () => {
    expect((await readCodexAutomations('.codex')).status).toBe('error')
  })
  it('keeps valid tasks when a sibling is corrupt without returning raw parser errors', async () => {
    await writeDefinition('ok')
    await writeDefinition('bad', 'prompt = "secret-must-not-escape')
    const result = await readCodexAutomations(home)
    expect(result.status).toBe('partial')
    expect(result.automations.map((a) => a.id)).toEqual(['ok'])
    expect(result.issues[0].code).toBe('invalid')
    expect(JSON.stringify(result)).not.toContain('secret-must-not-escape')
  })
  it('reports unsupported versions and mismatched IDs', async () => {
    await writeDefinition('future', stringify({ ...definition('future'), version: 2 }))
    await writeDefinition('mismatch', stringify(definition('other')))
    const result = await readCodexAutomations(home)
    expect(result.automations).toEqual([])
    expect(result.issues.map((x) => x.code).sort()).toEqual(['invalid', 'version'])
  })
  it('supports TOML multiline literals, CRLF and extra fields', async () => {
    await writeDefinition(
      'literal',
      'id="literal"\r\nname="任务"\r\nstatus="FUTURE"\r\nrrule="FREQ=HOURLY;INTERVAL=2"\r\nprompt=\'\'\'\n第一行\n第二行\'\'\'\r\n[target]\r\ntype="projectless"\r\n'
    )
    const result = await readCodexAutomations(home)
    expect(result.automations[0]).toMatchObject({
      prompt: '第一行\n第二行',
      status: 'FUTURE',
      cwds: []
    })
  })
  it('does not infer automation definitions from memory-only directories', async () => {
    await mkdir(join(home, 'automations', 'deleted'), { recursive: true })
    expect((await readCodexAutomations(home)).issues).toEqual([])
  })
  it('rereads edits and deletion instead of serving stale definitions', async () => {
    const file = await writeDefinition('cron')
    expect((await readCodexAutomations(home)).automations[0].status).toBe('ACTIVE')
    await writeDefinition('cron', stringify({ ...definition('cron'), status: 'PAUSED' }))
    expect((await readCodexAutomations(home)).automations[0].status).toBe('PAUSED')
    await rm(file)
    expect((await readCodexAutomations(home)).automations).toEqual([])
  })
  it('bounds file reads and skips linked files', async () => {
    await writeDefinition('huge', 'x'.repeat(256 * 1024 + 1))
    const source = await writeDefinition('original')
    await mkdir(join(home, 'automations', 'linked'))
    await symlink(source, join(home, 'automations', 'linked', 'automation.toml'))
    const result = await readCodexAutomations(home)
    expect(result.automations.map((a) => a.id)).toEqual(['original'])
    expect(result.issues.map((x) => x.code).sort()).toEqual(['oversized', 'unreadable'])
  })
  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'reports file permission failure separately and recovers',
    async () => {
      const file = await writeDefinition('locked')
      await chmod(file, 0)
      try {
        expect((await readCodexAutomations(home)).issues[0].code).toBe('permission')
      } finally {
        await chmod(file, 0o600)
      }
      expect((await readCodexAutomations(home)).status).toBe('ready')
    }
  )
})
