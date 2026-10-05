import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, realpath, rename, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  WorkspaceReviewQuery,
  WorkspaceReviewTarget
} from '../../shared/workspace-review-types'
import { inspectWorkspaceText } from './workspace-sensitive-signals'
import { WORKSPACE_REVIEW_FILE_MAX_BYTES, WorkspaceReviewSource } from './workspace-review-source'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function fixture(kind: WorkspaceReviewTarget['kind'] = 'folder') {
  const temp = await mkdtemp(join(tmpdir(), 'workspace-review-'))
  roots.push(temp)
  const rootPath = join(temp, 'workspace')
  await mkdir(rootPath)
  const target: WorkspaceReviewTarget = {
    id: 'stable-workspace',
    selector: 'folder:workspace',
    kind,
    hostId: 'local',
    name: '同名项目',
    rootPath,
    projectId: null,
    available: true,
    unavailableReason: null
  }
  const resolveTarget = vi.fn(async () => ({ ...target }))
  const authorizePath = vi.fn(async (path: string) => realpath(path))
  const readGitMetadata = vi.fn(async () => ({
    status: 'ready' as const,
    head: 'abc123',
    branch: 'feature',
    changes: [{ path: 'code.ts', status: 'modified' }],
    reason: null
  }))
  const source = new WorkspaceReviewSource({
    resolveTarget,
    authorizePath,
    readGitMetadata,
    inspectText: inspectWorkspaceText
  })
  const query: WorkspaceReviewQuery = {
    workspaceId: target.id,
    focus: '审阅所选材料',
    selection: {
      files: [{ path: 'code.ts', kind: 'code' }],
      sessionIds: [],
      policyReference: '',
      applicability: 'unconfirmed',
      applicabilityReason: ''
    }
  }
  await writeFile(join(rootPath, 'code.ts'), 'export const result = 1\n')
  return { temp, rootPath, target, query, source, resolveTarget, authorizePath, readGitMetadata }
}

describe('WorkspaceReviewSource', () => {
  it('captures only selected UTF-8 files and verifies the original before reading it', async () => {
    const f = await fixture()
    await writeFile(join(f.rootPath, 'unselected.txt'), '不得自动扫描或读取')
    const snapshot = await f.source.capture(f.query)
    expect(snapshot.files).toHaveLength(1)
    expect(snapshot.files[0]).toMatchObject({
      path: 'code.ts',
      status: 'read',
      kind: 'code',
      contentHash: createHash('sha256').update('export const result = 1\n').digest('hex')
    })
    expect(snapshot.partial).toBe(true)
    expect(snapshot.git.status).toBe('not_applicable')
    expect(f.readGitMetadata).not.toHaveBeenCalled()
    expect(JSON.stringify(snapshot)).not.toContain('export const')
    await expect(f.source.readEvidence(snapshot, snapshot.files[0]!.evidenceKey)).resolves.toEqual({
      text: 'export const result = 1\n',
      truncated: false,
      sourcePath: 'code.ts',
      byteOffset: 0
    })
  })

  it('retains missing, binary, oversized, unreadable and unsafe selections as gaps', async () => {
    const f = await fixture()
    await writeFile(join(f.rootPath, 'binary.dat'), Buffer.from([0, 1, 2]))
    await writeFile(join(f.rootPath, 'bad-encoding.txt'), Buffer.from([0xff, 0xfe, 0xfd]))
    await writeFile(
      join(f.rootPath, 'large.txt'),
      Buffer.alloc(WORKSPACE_REVIEW_FILE_MAX_BYTES + 1, 65)
    )
    await mkdir(join(f.rootPath, 'directory'))
    f.authorizePath.mockImplementation(async (path) => {
      if (path.endsWith('code.ts')) {
        throw new Error('permission denied')
      }
      return realpath(path)
    })
    f.query.selection.files = [
      'missing.txt',
      'binary.dat',
      'bad-encoding.txt',
      'large.txt',
      'code.ts',
      '../outside.txt',
      'directory'
    ].map((path) => ({ path, kind: 'document' }))
    const snapshot = await f.source.capture(f.query)
    expect(snapshot.files.map((file) => file.status)).toEqual([
      'missing',
      'binary',
      'binary',
      'too_large',
      'unreadable',
      'unsafe',
      'unsafe'
    ])
    expect(snapshot.files.every((file) => file.contentHash === null)).toBe(true)
    expect(snapshot.gaps).toContain('部分选定文件未读取正文，请查看逐项缺口')
    await expect(f.source.readEvidence(snapshot, snapshot.files[0]!.evidenceKey)).rejects.toThrow(
      '没有可读取'
    )
  })

  it('rejects file and ancestor symlinks even when they point inside the root', async () => {
    const f = await fixture()
    await mkdir(join(f.rootPath, 'actual'))
    await writeFile(join(f.rootPath, 'actual', 'text.txt'), 'linked text')
    await symlink(
      join(f.rootPath, 'actual'),
      join(f.rootPath, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )
    if (process.platform !== 'win32') {
      await symlink(join(f.rootPath, 'code.ts'), join(f.rootPath, 'leaf.ts'))
    }
    f.query.selection.files = [{ path: 'linked/text.txt', kind: 'document' }]
    if (process.platform !== 'win32') {
      f.query.selection.files.push({ path: 'leaf.ts', kind: 'code' })
    }
    const snapshot = await f.source.capture(f.query)
    expect(snapshot.files.every((file) => file.status === 'unsafe')).toBe(true)
  })

  it.each(['/tmp/secret', '..\\secret', 'C:\\secret', 'C:secret', 'code.ts\0evil'])(
    'refuses unsafe path %s',
    async (path) => {
      const f = await fixture()
      f.query.selection.files = [{ path, kind: 'code' }]
      const snapshot = await f.source.capture(f.query)
      expect(snapshot.files[0]?.status).toBe('unsafe')
    }
  )

  it('bounds the total content read while retaining every selection', async () => {
    const f = await fixture()
    const paths = Array.from({ length: 9 }, (_, index) => `file-${index}.txt`)
    await Promise.all(
      paths.map((path) =>
        writeFile(join(f.rootPath, path), Buffer.alloc(WORKSPACE_REVIEW_FILE_MAX_BYTES, 65))
      )
    )
    f.query.selection.files = paths.map((path) => ({ path, kind: 'document' }))
    const snapshot = await f.source.capture(f.query)
    expect(snapshot.files.filter((file) => file.status === 'read')).toHaveLength(8)
    expect(snapshot.files[8]?.status).toBe('too_large')
  })

  it('rejects changed content even when its size and modification time are preserved', async () => {
    const f = await fixture()
    const snapshot = await f.source.capture(f.query)
    const file = snapshot.files[0]!
    await writeFile(join(f.rootPath, 'code.ts'), 'export const result = 2\n')
    await utimes(join(f.rootPath, 'code.ts'), new Date(), new Date(file.mtimeMs!))
    await expect(f.source.readEvidence(snapshot, file.evidenceKey)).rejects.toThrow(
      '原始文件已变化'
    )
  })

  it('does not read a replacement root with the same registered name and identical content', async () => {
    const f = await fixture()
    const snapshot = await f.source.capture(f.query)
    await rename(f.rootPath, join(f.temp, 'old-root'))
    await mkdir(f.rootPath)
    await writeFile(join(f.rootPath, 'code.ts'), 'export const result = 1\n')
    await expect(f.source.readEvidence(snapshot, snapshot.files[0]!.evidenceKey)).rejects.toThrow(
      '根目录已变化'
    )
  })

  it('refuses unavailable or remote targets before any filesystem access', async () => {
    const f = await fixture()
    f.target.hostId = 'ssh:remote'
    await expect(f.source.capture(f.query)).rejects.toThrow('当前主机尚不支持')
    expect(f.authorizePath).not.toHaveBeenCalled()
    f.target.hostId = 'local'
    f.target.available = false
    await expect(f.source.capture(f.query)).rejects.toThrow('当前主机尚不支持')
    expect(f.authorizePath).not.toHaveBeenCalled()
  })

  it('rejects a changed catalog identity and snapshots stamped for another host', async () => {
    const f = await fixture()
    const snapshot = await f.source.capture(f.query)
    const key = snapshot.files[0]!.evidenceKey
    await expect(
      f.source.readEvidence(
        { ...snapshot, target: { ...snapshot.target, hostId: 'ssh:other' } },
        key
      )
    ).rejects.toThrow('登记身份已变化')
    f.target.id = 'replacement-workspace'
    await expect(f.source.readEvidence(snapshot, key)).rejects.toThrow('工作区身份已变化')
  })

  it('rejects catalog changes during capture instead of returning a mixed workspace snapshot', async () => {
    const f = await fixture('worktree')
    f.readGitMetadata.mockImplementationOnce(async () => {
      f.target.selector = 'id:replacement'
      return { status: 'ready', head: 'abc123', branch: 'feature', changes: [], reason: null }
    })
    await expect(f.source.capture(f.query)).rejects.toThrow('登记身份已变化')
  })

  it('rejects a workspace root that is itself a symlink', async () => {
    const f = await fixture()
    const link = join(f.temp, 'alias')
    await symlink(f.rootPath, link, process.platform === 'win32' ? 'junction' : 'dir')
    f.target.rootPath = link
    await expect(f.source.capture(f.query)).rejects.toThrow('符号链接')
  })

  it('rejects a parent replaced with a symlink during authorization', async () => {
    const f = await fixture()
    const original = join(f.rootPath, 'nested')
    const outside = join(f.temp, 'outside')
    await mkdir(original)
    await mkdir(outside)
    await writeFile(join(original, 'file.txt'), 'allowed')
    await writeFile(join(outside, 'file.txt'), 'outside')
    f.query.selection.files = [{ path: 'nested/file.txt', kind: 'document' }]
    let replaced = false
    f.authorizePath.mockImplementation(async (path) => {
      const authorized = await realpath(path)
      if (path.endsWith('file.txt') && !replaced) {
        replaced = true
        await rename(original, join(f.rootPath, 'previous'))
        await symlink(outside, original, process.platform === 'win32' ? 'junction' : 'dir')
      }
      return authorized
    })
    const snapshot = await f.source.capture(f.query)
    expect(snapshot.files[0]?.status).toBe('unsafe')
    expect(snapshot.files[0]?.contentHash).toBeNull()
  })

  it('refuses evidence keys and paths not included in the snapshot selection', async () => {
    const f = await fixture()
    const snapshot = await f.source.capture(f.query)
    const key = snapshot.files[0]!.evidenceKey
    await expect(f.source.readEvidence(snapshot, 'unknown')).rejects.toThrow('没有可读取')
    snapshot.selection.files = [{ path: 'other.txt', kind: 'document' }]
    await expect(f.source.readEvidence(snapshot, key)).rejects.toThrow('明确选取范围')
  })

  it('keeps Git metadata and verification/version gaps separate from source content', async () => {
    const f = await fixture('worktree')
    f.query.selection.files[0]!.kind = 'verification'
    f.query.selection.sessionIds = ['session-1']
    const snapshot = await f.source.capture(f.query)
    expect(snapshot.git.head).toBe('abc123')
    expect(snapshot.gaps.some((gap) => gap.includes('尚未证明'))).toBe(true)
    expect(snapshot.gaps.some((gap) => gap.includes('尚未纳入会话正文'))).toBe(true)
    f.readGitMetadata.mockRejectedValueOnce(new Error('not available'))
    expect((await f.source.capture(f.query)).git.status).toBe('unavailable')
  })

  it('stores only sensitive-signal locations and redacts the verified text on readback', async () => {
    const f = await fixture()
    const secret = 'sk-abcdefghijklmno123456789'
    await writeFile(join(f.rootPath, 'code.ts'), `API_KEY=${secret}\n`)
    const snapshot = await f.source.capture(f.query)
    expect(snapshot.files[0]?.signals.some((signal) => signal.category === 'credential')).toBe(true)
    expect(JSON.stringify(snapshot)).not.toContain(secret)
    const evidence = await f.source.readEvidence(snapshot, snapshot.files[0]!.evidenceKey)
    expect(evidence.text).not.toContain(secret)
  })
})
