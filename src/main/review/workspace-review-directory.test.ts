import { mkdir, mkdtemp, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceReviewTarget } from '../../shared/workspace-review-types'
import {
  listWorkspaceReviewFiles,
  WORKSPACE_REVIEW_DIRECTORY_MAX_ENTRIES
} from './workspace-review-directory'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function fixture(kind: WorkspaceReviewTarget['kind'] = 'folder') {
  const temp = await mkdtemp(join(tmpdir(), 'workspace-review-directory-'))
  roots.push(temp)
  const rootPath = await realpath(temp)
  const target: WorkspaceReviewTarget = {
    id: 'registered-workspace',
    selector: kind === 'folder' ? 'folder:workspace' : 'id:repo:/worktree',
    kind,
    hostId: 'local',
    name: '开发项目',
    rootPath,
    projectId: null,
    available: true,
    unavailableReason: null
  }
  const resolveTarget = vi.fn(async () => ({ ...target }))
  const authorizePath = vi.fn(async (path: string) => realpath(path))
  const query = { workspaceId: target.id, directory: '' }
  const deps = { resolveTarget, authorizePath }
  return { rootPath, target, query, deps }
}

describe('workspace Review directory browsing', () => {
  it.each(['folder', 'worktree'] as const)(
    'lists only the selected %s directory and returns names without file contents',
    async (kind) => {
      const f = await fixture(kind)
      await mkdir(join(f.rootPath, 'src'))
      await writeFile(join(f.rootPath, 'src', 'main.ts'), 'export const secret = true')
      await writeFile(join(f.rootPath, 'file10.txt'), 'private contents')
      await writeFile(join(f.rootPath, 'file2.txt'), 'unreadable contents', { mode: 0o000 })
      expect(await listWorkspaceReviewFiles(f.query, f.deps)).toEqual({
        directory: '',
        entries: [
          { path: 'src', name: 'src', kind: 'directory' },
          { path: 'file2.txt', name: 'file2.txt', kind: 'file' },
          { path: 'file10.txt', name: 'file10.txt', kind: 'file' }
        ],
        truncated: false
      })
      expect(await listWorkspaceReviewFiles({ ...f.query, directory: 'src' }, f.deps)).toEqual({
        directory: 'src',
        entries: [{ path: 'src/main.ts', name: 'main.ts', kind: 'file' }],
        truncated: false
      })
    }
  )

  it.each(['../outside', 'src/../../outside', '/tmp', '\\outside', 'C:\\secret', 'a\0b'])(
    'rejects unsafe relative directory %s before filesystem authorization',
    async (directory) => {
      const f = await fixture()
      await expect(listWorkspaceReviewFiles({ ...f.query, directory }, f.deps)).rejects.toThrow(
        '路径越界'
      )
      expect(f.deps.authorizePath).not.toHaveBeenCalled()
    }
  )

  it('refuses unknown identities, remote hosts, WSL paths and unavailable targets', async () => {
    const f = await fixture()
    for (const change of [
      { id: 'different' },
      { hostId: 'ssh:remote' },
      { hostId: 'unconfirmed' },
      { rootPath: '\\\\wsl.localhost\\Ubuntu\\project' },
      { available: false }
    ]) {
      f.deps.resolveTarget.mockResolvedValueOnce({ ...f.target, ...change })
      await expect(listWorkspaceReviewFiles(f.query, f.deps)).rejects.toThrow('当前主机尚不支持')
    }
    f.deps.resolveTarget.mockRejectedValueOnce(new Error('工作区未登记'))
    await expect(listWorkspaceReviewFiles(f.query, f.deps)).rejects.toThrow('未登记')
    expect(f.deps.authorizePath).not.toHaveBeenCalled()
  })

  it('refuses a root or directory that fails filesystem authorization', async () => {
    const f = await fixture()
    f.deps.authorizePath.mockRejectedValueOnce(new Error('Access denied'))
    await expect(listWorkspaceReviewFiles(f.query, f.deps)).rejects.toThrow('Access denied')
    f.deps.authorizePath.mockResolvedValueOnce(join(f.rootPath, 'different'))
    await expect(listWorkspaceReviewFiles(f.query, f.deps)).rejects.toThrow('路径越界')
  })

  it('excludes symlink children and refuses browsing through a symlink', async () => {
    const f = await fixture()
    await mkdir(join(f.rootPath, 'actual'))
    await mkdir(join(f.rootPath, 'actual', 'nested'))
    await symlink(
      join(f.rootPath, 'actual'),
      join(f.rootPath, 'alias'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )
    if (process.platform !== 'win32') {
      await writeFile(join(f.rootPath, 'actual', 'doc.md'), 'content')
      await symlink(join(f.rootPath, 'actual', 'doc.md'), join(f.rootPath, 'file-link.md'))
    }
    expect((await listWorkspaceReviewFiles(f.query, f.deps)).entries).toEqual([
      { path: 'actual', name: 'actual', kind: 'directory' }
    ])
    for (const directory of ['alias', 'alias/nested']) {
      await expect(listWorkspaceReviewFiles({ ...f.query, directory }, f.deps)).rejects.toThrow(
        '符号链接'
      )
    }
    f.target.rootPath = join(f.rootPath, 'alias')
    await expect(listWorkspaceReviewFiles(f.query, f.deps)).rejects.toThrow('符号链接')
  })

  it('bounds enumeration and marks an incomplete directory listing', async () => {
    const f = await fixture()
    await Promise.all(
      Array.from({ length: WORKSPACE_REVIEW_DIRECTORY_MAX_ENTRIES }, (_, index) =>
        writeFile(join(f.rootPath, `${index}.txt`), '')
      )
    )
    const complete = await listWorkspaceReviewFiles(f.query, f.deps)
    expect(complete.entries).toHaveLength(WORKSPACE_REVIEW_DIRECTORY_MAX_ENTRIES)
    expect(complete.truncated).toBe(false)
    await writeFile(join(f.rootPath, 'extra.txt'), '')
    const limited = await listWorkspaceReviewFiles(f.query, f.deps)
    expect(limited.entries).toHaveLength(WORKSPACE_REVIEW_DIRECTORY_MAX_ENTRIES)
    expect(limited.truncated).toBe(true)
  })

  it('rejects a directory replaced with a symlink during authorization', async () => {
    const f = await fixture()
    const path = join(f.rootPath, 'selected')
    await mkdir(path)
    await mkdir(join(f.rootPath, 'other'))
    let replaced = false
    f.deps.authorizePath.mockImplementation(async (candidate) => {
      if (candidate === path && !replaced) {
        replaced = true
        await rename(path, join(f.rootPath, 'previous'))
        await symlink(
          join(f.rootPath, 'other'),
          path,
          process.platform === 'win32' ? 'junction' : 'dir'
        )
        return candidate
      }
      return realpath(candidate)
    })
    await expect(
      listWorkspaceReviewFiles({ ...f.query, directory: 'selected' }, f.deps)
    ).rejects.toThrow('符号链接')
  })

  it('rejects a changed catalog registration instead of returning another project listing', async () => {
    const f = await fixture()
    f.deps.resolveTarget
      .mockResolvedValueOnce({ ...f.target })
      .mockResolvedValueOnce({ ...f.target, selector: 'folder:changed' })
    await expect(listWorkspaceReviewFiles(f.query, f.deps)).rejects.toThrow('登记在读取时发生变化')
  })
})
