import {
  getRepoExecutionHostId,
  parseExecutionHostId,
  toSshExecutionHostId
} from '../../shared/execution-host'
import {
  findFolderWorkspaceCandidateRepos,
  resolveFolderWorkspaceHost,
  type FolderWorkspaceHostState
} from '../../shared/folder-workspace-execution-host'
import type { FolderWorkspace } from '../../shared/folder-workspace-types'
import type { Repo } from '../../shared/repo-types'
import { canonicalWorktreeIdentity } from '../../shared/worktree/identity'
import { getRepoMainWorktreeId, splitWorktreeIdForFilesystem } from '../../shared/worktree/id'
import { isWslUncPath } from '../../shared/wsl-paths'
import type { WorkspaceReviewGit, WorkspaceReviewTarget } from '../../shared/workspace-review-types'
import type { Store } from '../persistence'
import {
  resolveLocalProjectRuntimeForRepo,
  type ProjectRuntimeResolutionStore
} from '../local-project-runtime-resolution'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'

type CatalogStore = Pick<
  Store,
  'getRepos' | 'getFolderWorkspaces' | 'getProjectGroups' | 'getAllWorktreeMetaForHost'
> &
  ProjectRuntimeResolutionStore
type CatalogRuntime = Pick<OrcaRuntimeService, 'getRuntimeGitStatus'>
const REMOTE_REASON = '此版本仅读取本机研发工作区；远端内容尚未读取'
const IDENTITY_REASON = '工作区持久身份尚未登记或存在歧义，请在应用中重新打开工作区'
const MAX_GIT_CHANGES = 1000

function localReason(hostId: string, path: string): string | null {
  if (hostId === 'unconfirmed') {
    return '工作区执行主机尚未确认，尚未读取'
  }
  if (hostId !== 'local') {
    return REMOTE_REASON
  }
  return isWslUncPath(path) ? 'WSL 工作区尚未接入本机审阅' : null
}

function folderHost(workspace: FolderWorkspace, state: FolderWorkspaceHostState): string {
  const group = state.projectGroups.find((entry) => entry.id === workspace.projectGroupId)
  const pin = workspace.executionHostId ?? group?.executionHostId
  if (pin) {
    const host = parseExecutionHostId(pin)
    const connectionId =
      workspace.connectionId ?? (workspace.executionHostId ? null : group?.connectionId)
    return host?.kind === 'local' && connectionId?.trim()
      ? 'unconfirmed'
      : (host?.id ?? 'unconfirmed')
  }
  if (state.folderWorkspaces.filter((entry) => entry.id === workspace.id).length > 1) {
    return 'unconfirmed'
  }
  const candidateRepos = findFolderWorkspaceCandidateRepos(state, workspace.id)
  if (candidateRepos.some((repo) => getRepoExecutionHostId(repo).startsWith('runtime:'))) {
    return 'unconfirmed'
  }
  const resolved = resolveFolderWorkspaceHost(state, workspace.id)
  if (resolved.kind === 'ssh') {
    return toSshExecutionHostId(resolved.targetId)
  }
  return resolved.kind === 'local' ? 'local' : 'unconfirmed'
}

function unavailableGit(reason: string): WorkspaceReviewGit {
  return { status: 'unavailable', head: null, branch: null, changes: [], reason }
}

export class WorkspaceReviewCatalog {
  constructor(
    private readonly store: CatalogStore,
    private readonly runtime: CatalogRuntime
  ) {}

  private repoReason(repo: Repo): string | null {
    const hostId = getRepoExecutionHostId(repo)
    if (repo.executionHostId && !parseExecutionHostId(repo.executionHostId)) {
      return IDENTITY_REASON
    }
    if (hostId === 'local' && repo.connectionId?.trim()) {
      return IDENTITY_REASON
    }
    const reason = localReason(hostId, repo.path)
    if (reason) {
      return reason
    }
    const resolution = resolveLocalProjectRuntimeForRepo(this.store, repo)
    if (resolution?.status === 'repair-required') {
      return '工作区执行环境需要修复，尚未读取'
    }
    if (resolution?.status === 'resolved' && resolution.runtime.kind === 'wsl') {
      return 'WSL 工作区尚未接入本机审阅'
    }
    return null
  }

  private repoTargets(repo: Repo, repos: Repo[]): WorkspaceReviewTarget[] {
    const hostId = getRepoExecutionHostId(repo)
    const projectId =
      this.store.getProjects?.().find((entry) => entry.sourceRepoIds.includes(repo.id))?.id ?? null
    const reason = this.repoReason(repo)
    const base = { hostId, projectId, name: repo.displayName, rootPath: repo.path }
    if (repo.kind === 'folder') {
      return [
        {
          ...base,
          id: `folder:${encodeURIComponent(hostId)}:repo:${encodeURIComponent(repo.id)}`,
          selector: `id:${getRepoMainWorktreeId(repo)}`,
          kind: 'folder',
          available: !reason,
          unavailableReason: reason
        }
      ]
    }
    const owners = repos.filter((candidate) => candidate.id === repo.id).length
    const targets: WorkspaceReviewTarget[] = []
    for (const [locator, meta] of Object.entries(this.store.getAllWorktreeMetaForHost(hostId))) {
      const parsed = splitWorktreeIdForFilesystem(locator)
      if (!parsed || parsed.repoId !== repo.id || (meta.hostId && meta.hostId !== hostId)) {
        continue
      }
      if (!meta.hostId && owners > 1) {
        continue
      }
      const knownIdentity =
        meta.instanceId && meta.hostId
          ? canonicalWorktreeIdentity({
              worktreeId: locator,
              executionHostId: meta.hostId,
              instanceId: meta.instanceId
            })
          : null
      const unavailableReason =
        reason ??
        localReason(hostId, parsed.worktreePath) ??
        (owners > 1 || !knownIdentity ? IDENTITY_REASON : null)
      targets.push({
        ...base,
        id:
          knownIdentity ??
          `unresolved-worktree:${encodeURIComponent(hostId)}:${encodeURIComponent(locator)}`,
        selector: `id:${locator}`,
        kind: 'worktree',
        name: meta.displayName || repo.displayName,
        rootPath: parsed.worktreePath,
        projectId: meta.projectId ?? projectId,
        available: !unavailableReason,
        unavailableReason
      })
    }
    return targets.length
      ? targets
      : [
          {
            ...base,
            id: `registered-repo:${encodeURIComponent(hostId)}:${encodeURIComponent(repo.id)}`,
            selector: `id:${getRepoMainWorktreeId(repo)}`,
            kind: 'worktree',
            available: false,
            unavailableReason: reason ?? IDENTITY_REASON
          }
        ]
  }

  async list(): Promise<WorkspaceReviewTarget[]> {
    const repos = this.store.getRepos()
    const state = {
      repos,
      folderWorkspaces: this.store.getFolderWorkspaces(),
      projectGroups: this.store.getProjectGroups()
    }
    const targets = repos.flatMap((repo) => this.repoTargets(repo, repos))
    for (const workspace of state.folderWorkspaces) {
      const hostId = folderHost(workspace, state)
      const candidates = findFolderWorkspaceCandidateRepos(state, workspace.id)
      const unavailableReason =
        localReason(hostId, workspace.folderPath) ??
        candidates.map((repo) => this.repoReason(repo)).find((reason) => reason !== null) ??
        null
      targets.push({
        id: `folder:${encodeURIComponent(hostId)}:${encodeURIComponent(workspace.id)}`,
        selector: `folder:${workspace.id}`,
        kind: 'folder',
        hostId,
        name: workspace.name,
        rootPath: workspace.folderPath,
        projectId: null,
        available: !unavailableReason,
        unavailableReason
      })
    }
    const unique = new Map<string, WorkspaceReviewTarget>()
    for (const target of targets) {
      const previous = unique.get(target.id)
      if (
        previous &&
        (previous.rootPath !== target.rootPath || previous.selector !== target.selector)
      ) {
        unique.set(target.id, { ...previous, available: false, unavailableReason: IDENTITY_REASON })
      } else if (!previous) {
        unique.set(target.id, target)
      }
    }
    return [...unique.values()]
  }

  async resolve(id: string): Promise<WorkspaceReviewTarget> {
    const target = (await this.list()).find((entry) => entry.id === id)
    if (!target) {
      throw new Error('工作区未登记或身份已变化，请重新选取')
    }
    return target
  }

  async git(target: WorkspaceReviewTarget): Promise<WorkspaceReviewGit> {
    try {
      const current = await this.resolve(target.id)
      if (!current.available || current.hostId !== 'local') {
        return unavailableGit(current.unavailableReason ?? REMOTE_REASON)
      }
      if (current.rootPath !== target.rootPath || current.selector !== target.selector) {
        return unavailableGit('工作区登记已变化，请重新读取')
      }
      if (current.kind === 'folder') {
        return {
          status: 'not_applicable',
          head: null,
          branch: null,
          changes: [],
          reason: '普通文件夹没有 Git 变更元数据'
        }
      }
      const status = await this.runtime.getRuntimeGitStatus(current.selector, {
        includeLineStats: false
      })
      const truncated = status.didHitLimit === true || status.entries.length > MAX_GIT_CHANGES
      return {
        status: truncated ? 'unavailable' : 'ready',
        head: status.head || null,
        branch: status.branch || null,
        changes: status.entries.slice(0, MAX_GIT_CHANGES).map((entry) => ({
          path: entry.path,
          status: `${entry.area}:${entry.conflictStatus ?? entry.status}`
        })),
        reason: truncated ? 'Git 变更清单超过读取上限，当前清单不完整' : null
      }
    } catch {
      return unavailableGit('Git 元数据读取失败或工作区身份已变化')
    }
  }
}
