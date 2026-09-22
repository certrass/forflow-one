import { opendir } from 'node:fs/promises'
import { posix } from 'node:path'
import { compareFileNames } from '../../shared/file-name-sort'
import { isWslUncPath } from '../../shared/wsl-paths'
import {
  workspaceReviewDirectoryQuerySchema,
  workspaceReviewTargetSchema,
  type WorkspaceReviewDirectory,
  type WorkspaceReviewDirectoryQuery,
  type WorkspaceReviewTarget
} from '../../shared/workspace-review-types'
import {
  normalizeWorkspaceReviewPath,
  resolveWorkspaceReviewDirectory,
  resolveWorkspaceReviewRoot,
  type WorkspaceReviewAuthorizePath
} from './workspace-review-file-access'

export const WORKSPACE_REVIEW_DIRECTORY_MAX_ENTRIES = 500

type WorkspaceReviewDirectoryDependencies = {
  resolveTarget: (workspaceId: string) => Promise<WorkspaceReviewTarget>
  authorizePath: WorkspaceReviewAuthorizePath
}

function availableTarget(workspaceId: string, input: WorkspaceReviewTarget) {
  const target = workspaceReviewTargetSchema.parse(input)
  if (
    target.id !== workspaceId ||
    target.hostId !== 'local' ||
    !target.available ||
    isWslUncPath(target.rootPath)
  ) {
    throw new Error('工作区身份已变化或当前主机尚不支持读取此工作区')
  }
  return target
}

export async function listWorkspaceReviewFiles(
  input: WorkspaceReviewDirectoryQuery,
  deps: WorkspaceReviewDirectoryDependencies
): Promise<WorkspaceReviewDirectory> {
  const query = workspaceReviewDirectoryQuerySchema.parse(input)
  const directory = query.directory === '' ? '' : normalizeWorkspaceReviewPath(query.directory)
  const target = availableTarget(query.workspaceId, await deps.resolveTarget(query.workspaceId))
  const root = await resolveWorkspaceReviewRoot(target.rootPath, deps.authorizePath)
  const before = await resolveWorkspaceReviewDirectory(root, directory, deps.authorizePath)
  const entries: WorkspaceReviewDirectory['entries'] = []
  let count = 0
  let truncated = false
  const handle = await opendir(before.path)
  for await (const entry of handle) {
    count += 1
    if (count > WORKSPACE_REVIEW_DIRECTORY_MAX_ENTRIES) {
      truncated = true
      break
    }
    if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) {
      continue
    }
    try {
      if (normalizeWorkspaceReviewPath(entry.name) !== entry.name) {
        continue
      }
    } catch {
      continue
    }
    entries.push({
      name: entry.name,
      path: posix.join(directory, entry.name),
      kind: entry.isDirectory() ? 'directory' : 'file'
    })
  }
  const after = await resolveWorkspaceReviewDirectory(root, directory, deps.authorizePath)
  const current = availableTarget(target.id, await deps.resolveTarget(target.id))
  if (
    before.stats.dev !== after.stats.dev ||
    before.stats.ino !== after.stats.ino ||
    before.stats.birthtimeMs !== after.stats.birthtimeMs ||
    before.stats.mtimeMs !== after.stats.mtimeMs ||
    before.stats.ctimeMs !== after.stats.ctimeMs ||
    current.rootPath !== target.rootPath ||
    current.selector !== target.selector ||
    current.kind !== target.kind ||
    current.projectId !== target.projectId
  ) {
    throw new Error('目录或工作区登记在读取时发生变化，请重新选取')
  }
  entries.sort((left, right) =>
    left.kind === right.kind
      ? compareFileNames(left.name, right.name)
      : left.kind === 'directory'
        ? -1
        : 1
  )
  return { directory, entries, truncated }
}
