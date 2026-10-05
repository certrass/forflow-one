import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionHostId } from '../../shared/execution-host'
import type { FolderWorkspace } from '../../shared/folder-workspace-types'
import type { GitStatusResult } from '../../shared/git-status-types'
import type { ProjectExecutionRuntimeResolution } from '../../shared/project-execution-runtime'
import type { ProjectGroup } from '../../shared/project-group-types'
import type { Repo } from '../../shared/repo-types'
import type { WorktreeMeta } from '../../shared/worktree/meta-types'
import { workspaceReviewTargetSchema } from '../../shared/workspace-review-types'

const mocks = vi.hoisted(() => ({
  resolution: vi.fn<() => ProjectExecutionRuntimeResolution | undefined>()
}))
vi.mock('../local-project-runtime-resolution', () => ({
  resolveLocalProjectRuntimeForRepo: mocks.resolution
}))

import { WorkspaceReviewCatalog } from './workspace-review-catalog'

function repo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: 'repo-a',
    path: '/repo',
    displayName: '研发',
    badgeColor: '',
    addedAt: 1,
    ...overrides
  }
}
function meta(overrides: Partial<WorktreeMeta> = {}): WorktreeMeta {
  return {
    instanceId: 'instance-a',
    hostId: 'local',
    displayName: '修订甲',
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 1,
    ...overrides
  }
}
function folder(overrides: Partial<FolderWorkspace> = {}): FolderWorkspace {
  return {
    id: 'folder-a',
    projectGroupId: 'group-a',
    name: '资料',
    folderPath: '/notes',
    linkedTask: null,
    comment: '',
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 1,
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  }
}
function group(overrides: Partial<ProjectGroup> = {}): ProjectGroup {
  return {
    id: 'group-a',
    name: '项目组',
    parentPath: null,
    parentGroupId: null,
    createdFrom: 'manual',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  }
}
function fixture() {
  const repos: Repo[] = [repo()]
  const folders: FolderWorkspace[] = []
  const groups: ProjectGroup[] = []
  const metadata: Record<string, Record<string, WorktreeMeta>> = {
    local: { 'repo-a::/repo': meta() }
  }
  const runtime = {
    getRuntimeGitStatus: vi.fn<() => Promise<GitStatusResult>>().mockResolvedValue({
      entries: [{ path: 'src/main.ts', status: 'modified', area: 'unstaged' }],
      conflictOperation: 'unknown',
      head: 'a'.repeat(40),
      branch: 'main'
    })
  }
  const store = {
    getRepos: () => repos,
    getFolderWorkspaces: () => folders,
    getProjectGroups: () => groups,
    getAllWorktreeMetaForHost: (host: ExecutionHostId) => metadata[host] ?? {},
    getProjects: () => [],
    getSettings: () => ({})
  }
  return {
    catalog: new WorkspaceReviewCatalog(store, runtime),
    repos,
    folders,
    groups,
    metadata,
    runtime
  }
}

beforeEach(() => mocks.resolution.mockReset())

describe('workspace review registered catalog', () => {
  it('lists registered stable identities without Git or filesystem queries', async () => {
    const { catalog, runtime } = fixture()
    const targets = await catalog.list()
    expect(targets).toEqual([
      expect.objectContaining({
        id: 'wt2:local:instance-a',
        selector: 'id:repo-a::/repo',
        rootPath: '/repo',
        available: true
      })
    ])
    expect(workspaceReviewTargetSchema.safeParse(targets[0]).success).toBe(true)
    expect(runtime.getRuntimeGitStatus).not.toHaveBeenCalled()
  })

  it('preserves an instance identity across a registered directory move', async () => {
    const f = fixture()
    const [original] = await f.catalog.list()
    f.metadata.local = { 'repo-a::/moved': meta() }
    expect(await f.catalog.resolve('wt2:local:instance-a')).toMatchObject({
      id: original?.id,
      rootPath: '/moved'
    })
    if (!original) {
      throw new Error('missing fixture')
    }
    expect(await f.catalog.git(original)).toMatchObject({ status: 'unavailable' })
    expect(f.runtime.getRuntimeGitStatus).not.toHaveBeenCalled()
  })

  it('rejects an old identity when a checkout is replaced at the same path', async () => {
    const f = fixture()
    f.metadata.local = { 'repo-a::/repo': meta({ instanceId: 'replacement' }) }
    await expect(f.catalog.resolve('wt2:local:instance-a')).rejects.toThrow('身份已变化')
  })

  it('marks missing identities and no-metadata repo rows unavailable without inventing wt2 keys', async () => {
    const f = fixture()
    f.metadata.local = { 'repo-a::/repo': meta({ instanceId: undefined }) }
    expect(await f.catalog.list()).toEqual([
      expect.objectContaining({
        available: false,
        id: expect.stringMatching(/^unresolved-worktree:/)
      })
    ])
    f.metadata.local = {}
    expect(await f.catalog.list()).toEqual([
      expect.objectContaining({ available: false, id: expect.stringMatching(/^registered-repo:/) })
    ])
  })

  it.each(['ssh:host-a', 'runtime:host-b'] as const)(
    'lists %s metadata as unavailable without querying the host',
    async (hostId) => {
      const f = fixture()
      f.repos[0] = repo({ executionHostId: hostId })
      f.metadata[hostId] = { 'repo-a::/repo': meta({ hostId }) }
      const [target] = await f.catalog.list()
      expect(target).toMatchObject({ hostId, available: false })
      if (!target) {
        throw new Error('missing fixture')
      }
      expect(await f.catalog.git(target)).toMatchObject({ status: 'unavailable' })
      expect(f.runtime.getRuntimeGitStatus).not.toHaveBeenCalled()
    }
  )

  it('does not make shared repo IDs or identity aliases into locally dispatchable targets', async () => {
    const f = fixture()
    f.repos.push(repo({ path: '/remote', executionHostId: 'ssh:other' }))
    expect((await f.catalog.resolve('wt2:local:instance-a')).available).toBe(false)
    f.repos.pop()
    f.metadata.local['repo-a::/alias'] = meta()
    expect((await f.catalog.resolve('wt2:local:instance-a')).available).toBe(false)
  })

  it('lists both folder repositories and independent folder workspaces without Git identities', async () => {
    const f = fixture()
    f.repos[0] = repo({ kind: 'folder' })
    f.folders.push(folder())
    const targets = await f.catalog.list()
    expect(targets).toHaveLength(2)
    for (const target of targets) {
      expect(target).toMatchObject({ kind: 'folder', available: true })
      expect(target.id).toMatch(/^folder:local:/)
      expect(await f.catalog.git(target)).toMatchObject({ status: 'not_applicable' })
    }
    expect(f.runtime.getRuntimeGitStatus).not.toHaveBeenCalled()
  })

  it.each([
    { workspace: { executionHostId: 'runtime:peer' as const }, group: {}, host: 'runtime:peer' },
    { workspace: { connectionId: 'host-a' }, group: {}, host: 'ssh:host-a' },
    { workspace: {}, group: { connectionId: 'host-a' }, host: 'ssh:host-a' },
    { workspace: {}, group: { executionHostId: 'runtime:peer' }, host: 'runtime:peer' },
    { workspace: {}, group: { executionHostId: 'ssh:host-b' }, host: 'ssh:host-b' },
    {
      workspace: { executionHostId: 'local' as const, connectionId: 'remote' },
      group: {},
      host: 'unconfirmed'
    },
    {
      workspace: {},
      group: { executionHostId: 'local', connectionId: 'remote' },
      host: 'unconfirmed'
    }
  ])('respects folder host ownership: %j', async (input) => {
    const f = fixture()
    f.folders.push(folder(input.workspace))
    f.groups.push(group(input.group))
    expect((await f.catalog.list()).find((target) => target.kind === 'folder')).toMatchObject({
      hostId: input.host,
      available: false
    })
    expect(f.runtime.getRuntimeGitStatus).not.toHaveBeenCalled()
  })

  it('keeps ambiguous folder ownership unconfirmed', async () => {
    const f = fixture()
    f.repos[0] = repo({ projectGroupId: 'group-a' })
    f.repos.push(
      repo({
        id: 'remote',
        path: '/remote',
        projectGroupId: 'group-a',
        executionHostId: 'ssh:peer'
      })
    )
    f.folders.push(folder())
    f.groups.push(group())
    expect((await f.catalog.list()).find((target) => target.kind === 'folder')).toMatchObject({
      hostId: 'unconfirmed',
      available: false
    })
  })

  it.each(['ssh:peer', 'runtime:peer'] as const)(
    'keeps an explicitly local folder readable in a group containing %s repositories',
    async (hostId) => {
      const f = fixture()
      f.repos[0] = repo({ projectGroupId: 'group-a' })
      f.repos.push(
        repo({ id: 'remote', path: '/remote', projectGroupId: 'group-a', executionHostId: hostId })
      )
      f.folders.push(folder({ executionHostId: 'local' }))
      f.groups.push(group())
      const target = (await f.catalog.list()).find((entry) => entry.kind === 'folder')
      expect(target).toMatchObject({ hostId: 'local', available: true, unavailableReason: null })
      expect(f.runtime.getRuntimeGitStatus).not.toHaveBeenCalled()
    }
  )

  it('keeps WSL and runtime-repair targets unavailable', async () => {
    const f = fixture()
    mocks.resolution.mockReturnValue({
      status: 'repair-required',
      repair: {
        projectId: 'project',
        preferredRuntime: { kind: 'wsl', distro: null },
        reason: 'wsl-unavailable',
        source: 'project-override',
        cacheKey: 'repair'
      }
    })
    expect((await f.catalog.list())[0]?.available).toBe(false)
    mocks.resolution.mockReset()
    f.folders.push(folder({ folderPath: '\\\\wsl.localhost\\Ubuntu\\repo' }))
    expect((await f.catalog.list()).find((target) => target.kind === 'folder')?.available).toBe(
      false
    )
  })

  it('reads Git only for the selected registered local target and preserves staging context', async () => {
    const f = fixture()
    const target = await f.catalog.resolve('wt2:local:instance-a')
    expect(await f.catalog.git(target)).toMatchObject({
      status: 'ready',
      head: 'a'.repeat(40),
      branch: 'main',
      changes: [{ path: 'src/main.ts', status: 'unstaged:modified' }]
    })
    expect(f.runtime.getRuntimeGitStatus).toHaveBeenCalledExactlyOnceWith('id:repo-a::/repo', {
      includeLineStats: false
    })
  })

  it('does not present truncated status as a complete or clean result', async () => {
    const f = fixture()
    f.runtime.getRuntimeGitStatus.mockResolvedValue({
      entries: [],
      conflictOperation: 'unknown',
      didHitLimit: true
    })
    expect(await f.catalog.git(await f.catalog.resolve('wt2:local:instance-a'))).toMatchObject({
      status: 'unavailable',
      reason: expect.stringContaining('不完整')
    })
  })

  it('reports a failed Git query without returning raw provider errors', async () => {
    const f = fixture()
    f.runtime.getRuntimeGitStatus.mockRejectedValue(new Error('synthetic-sensitive-provider-error'))
    const result = await f.catalog.git(await f.catalog.resolve('wt2:local:instance-a'))
    expect(result.status).toBe('unavailable')
    expect(JSON.stringify(result)).not.toContain('synthetic-sensitive-provider-error')
  })
})
