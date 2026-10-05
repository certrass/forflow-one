import { createHash } from 'node:crypto'
import { constants, type Stats } from 'node:fs'
import { lstat, open, realpath, stat } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { isPathInsideOrEqual } from '../../shared/cross-platform-path'
import { readNodeFileHandleWithinLimit } from '../../shared/node-bounded-file-reader'
import { normalizeRuntimeRelativePath } from '../runtime/runtime-relative-paths'

export class WorkspaceReviewUnsafePathError extends Error {
  constructor() {
    super('文件路径越界、包含符号链接或不属于普通文件')
    this.name = 'WorkspaceReviewUnsafePathError'
  }
}

export type WorkspaceReviewRoot = { path: string; identity: string }
export type WorkspaceReviewAuthorizePath = (path: string) => Promise<string>

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function sameFile(left: Stats, right: Stats): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.birthtimeMs === right.birthtimeMs
}

export async function resolveWorkspaceReviewRoot(
  rootPath: string,
  authorizePath: WorkspaceReviewAuthorizePath
): Promise<WorkspaceReviewRoot> {
  if (!isAbsolute(rootPath)) {
    throw new WorkspaceReviewUnsafePathError()
  }
  const path = await realpath(rootPath)
  if (resolve(await authorizePath(rootPath)) !== resolve(path)) {
    throw new WorkspaceReviewUnsafePathError()
  }
  const rootStat = await stat(path)
  if (!rootStat.isDirectory() || (await lstat(resolve(rootPath))).isSymbolicLink()) {
    throw new WorkspaceReviewUnsafePathError()
  }
  return {
    path,
    identity: digest(JSON.stringify([path, rootStat.dev, rootStat.ino, rootStat.birthtimeMs]))
  }
}

export function normalizeWorkspaceReviewPath(path: string): string {
  if (path.includes('\0') || path.includes(':')) {
    throw new WorkspaceReviewUnsafePathError()
  }
  try {
    const normalized = normalizeRuntimeRelativePath(path)
    if (!normalized) {
      throw new WorkspaceReviewUnsafePathError()
    }
    return normalized
  } catch {
    throw new WorkspaceReviewUnsafePathError()
  }
}

async function assertUnlinkedPath(
  root: string,
  relativePath: string,
  leafKind: 'file' | 'directory' = 'file'
): Promise<string> {
  const parts = relativePath.split('/')
  let path = root
  for (const [index, part] of parts.entries()) {
    path = join(path, part)
    const entry = await lstat(path)
    if (
      entry.isSymbolicLink() ||
      (index < parts.length - 1 || leafKind === 'directory'
        ? !entry.isDirectory()
        : !entry.isFile())
    ) {
      throw new WorkspaceReviewUnsafePathError()
    }
  }
  const canonical = await realpath(path)
  if (!isPathInsideOrEqual(root, canonical) || resolve(canonical) !== resolve(path)) {
    throw new WorkspaceReviewUnsafePathError()
  }
  return canonical
}

export async function resolveWorkspaceReviewDirectory(
  root: WorkspaceReviewRoot,
  directory: string,
  authorizePath: WorkspaceReviewAuthorizePath
): Promise<{ path: string; stats: Stats }> {
  const normalized = directory === '' ? '' : normalizeWorkspaceReviewPath(directory)
  const path = normalized ? await assertUnlinkedPath(root.path, normalized, 'directory') : root.path
  const before = await lstat(path)
  if (resolve(await authorizePath(path)) !== resolve(path)) {
    throw new WorkspaceReviewUnsafePathError()
  }
  const currentRoot = await resolveWorkspaceReviewRoot(root.path, authorizePath)
  const currentPath = normalized
    ? await assertUnlinkedPath(root.path, normalized, 'directory')
    : currentRoot.path
  const after = await lstat(currentPath)
  if (
    currentRoot.identity !== root.identity ||
    currentPath !== path ||
    !before.isDirectory() ||
    !after.isDirectory() ||
    !sameFile(before, after)
  ) {
    throw new WorkspaceReviewUnsafePathError()
  }
  return { path, stats: after }
}

export async function readWorkspaceReviewFile(
  root: WorkspaceReviewRoot,
  relativePath: string,
  maxBytes: number,
  authorizePath: WorkspaceReviewAuthorizePath
): Promise<{ buffer: Buffer; stats: Stats }> {
  const normalized = normalizeWorkspaceReviewPath(relativePath)
  const path = await assertUnlinkedPath(root.path, normalized)
  if (resolve(await authorizePath(path)) !== resolve(path)) {
    throw new WorkspaceReviewUnsafePathError()
  }
  const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0
  const nonBlock = typeof constants.O_NONBLOCK === 'number' ? constants.O_NONBLOCK : 0
  const handle = await open(path, constants.O_RDONLY | noFollow | nonBlock)
  try {
    const before = await handle.stat()
    const openedRoot = await resolveWorkspaceReviewRoot(root.path, authorizePath)
    if (
      openedRoot.identity !== root.identity ||
      (await assertUnlinkedPath(root.path, normalized)) !== path ||
      !before.isFile() ||
      !sameFile(before, await stat(path))
    ) {
      throw new WorkspaceReviewUnsafePathError()
    }
    const result = await readNodeFileHandleWithinLimit(handle, maxBytes)
    const after = await handle.stat()
    const currentRoot = await resolveWorkspaceReviewRoot(root.path, authorizePath)
    const currentPath = await assertUnlinkedPath(root.path, normalized)
    if (
      currentRoot.identity !== root.identity ||
      currentPath !== path ||
      !sameFile(after, await stat(path)) ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      result.buffer.length !== after.size
    ) {
      throw new Error('文件在读取期间发生变化，请重新读取')
    }
    return { buffer: result.buffer, stats: after }
  } finally {
    await handle.close()
  }
}
