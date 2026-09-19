import type * as FsPromises from 'node:fs/promises'
import { mkdir, readlink, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const deniedReadlink = vi.hoisted(() => vi.fn())
vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => tmpdir(), getAppPath: () => tmpdir() }
}))
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof FsPromises>()
  return { ...original, readlink: deniedReadlink }
})

import { CliInstaller } from './cli-installer'
import { createPackagedMacLauncher, makeFixture } from './cli-installer-test-fixtures'

afterEach(() => vi.resetAllMocks())

describe('unreadable command ownership', () => {
  it.skipIf(process.platform === 'win32').each(['EACCES', 'EPERM'])(
    'rejects %s status and mutations without removing the unknown link',
    async (code) => {
      const fixture = await makeFixture()
      const commandPath = join(fixture.root, 'bin', 'orca')
      const resourcesPath = await createPackagedMacLauncher(fixture.root)
      const unknownTarget = join(fixture.root, 'unknown-launcher')
      await mkdir(join(fixture.root, 'bin'), { recursive: true })
      await symlink(unknownTarget, commandPath)
      const error = Object.assign(new Error(`${code}: permission denied, readlink`), { code })
      deniedReadlink.mockRejectedValue(error)
      const privilegedRunner = vi.fn()
      const installer = new CliInstaller({
        platform: 'darwin',
        isPackaged: true,
        resourcesPath,
        commandPathOverride: commandPath,
        processPathEnv: join(fixture.root, 'bin'),
        privilegedRunner
      })
      await expect(installer.getStatus()).rejects.toBe(error)
      await expect(installer.install()).rejects.toBe(error)
      await expect(installer.remove()).rejects.toBe(error)
      expect(privilegedRunner).not.toHaveBeenCalled()
      const original = await vi.importActual<typeof FsPromises>('node:fs/promises')
      await expect(original.readlink(commandPath)).resolves.toBe(unknownTarget)
      deniedReadlink.mockImplementation(original.readlink)
      await expect(installer.getStatus()).resolves.toMatchObject({
        state: 'conflict',
        currentTarget: unknownTarget
      })
      await expect(readlink(commandPath)).resolves.toBe(unknownTarget)
    }
  )
})
