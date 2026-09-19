import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installForflowBundledSkills } from './bundled-skill-install'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'forflow-skill-test-'))
  roots.push(root)
  return {
    names: ['orca-cli'],
    homeDirectory: root,
    stateDirectory: join(root, 'state'),
    version: 'test.1',
    launcherPath: '/Applications/Forflow One.app/Contents/Resources/bin/forflow'
  }
}

describe('Forflow bundled offline installation', () => {
  it('installs, discovers, records provenance and preserves a modified local skill', async () => {
    const input = await fixture()
    expect(await installForflowBundledSkills(input)).toEqual([
      {
        name: 'orca-cli',
        status: 'installed',
        path: join(input.homeDirectory, '.agents/skills/orca-cli')
      }
    ])
    expect((await installForflowBundledSkills(input))[0].status).toBe('unchanged')
    const file = join(input.homeDirectory, '.agents/skills/orca-cli/SKILL.md')
    const original = await readFile(file, 'utf8')
    expect(original).toContain('skills get forflow-cli')
    expect(original).not.toContain('npx')
    await writeFile(file, `${original}\n用户的本地修改\n`)
    expect((await installForflowBundledSkills({ ...input, version: 'test.2' }))[0].status).toBe(
      'conflict'
    )
    expect(await readFile(file, 'utf8')).toContain('用户的本地修改')
  })
  it('rejects unknown names and traversal before creating any install', async () => {
    const input = await fixture()
    for (const names of [['../../bad'], ['constructor'], [], ['unknown']]) {
      await expect(installForflowBundledSkills({ ...input, names })).rejects.toThrow()
    }
  })
  it('keeps existing unrelated content and refuses to overwrite an external symlink', async () => {
    const input = await fixture()
    const external = join(input.homeDirectory, 'external')
    await mkdir(external)
    await writeFile(join(external, 'SKILL.md'), 'original')
    await mkdir(join(input.homeDirectory, '.agents/skills'), { recursive: true })
    await symlink(external, join(input.homeDirectory, '.agents/skills/orca-cli'))
    expect((await installForflowBundledSkills(input))[0].status).toBe('conflict')
    expect(await readFile(join(external, 'SKILL.md'), 'utf8')).toBe('original')
  })
})
