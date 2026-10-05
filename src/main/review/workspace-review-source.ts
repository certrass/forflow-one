import { createHash } from 'node:crypto'
import { isBinaryBuffer } from '../../shared/binary-buffer'
import { NodeFileReadTooLargeError } from '../../shared/node-bounded-file-reader'
import {
  workspaceReviewQuerySchema,
  workspaceReviewSnapshotSchema,
  workspaceReviewTargetSchema,
  workspaceReviewGitSchema,
  type WorkspaceReviewTarget,
  type WorkspaceReviewQuery,
  type WorkspaceReviewSnapshot,
  type WorkspaceReviewFile,
  type WorkspaceReviewGit,
  type WorkspaceSensitiveSignal
} from '../../shared/workspace-review-types'
import { MAX_WORKSPACE_SENSITIVE_SIGNALS, redactWorkspaceText } from './workspace-sensitive-signals'
import {
  normalizeWorkspaceReviewPath,
  readWorkspaceReviewFile,
  resolveWorkspaceReviewRoot,
  WorkspaceReviewUnsafePathError,
  type WorkspaceReviewAuthorizePath,
  type WorkspaceReviewRoot
} from './workspace-review-file-access'

export const WORKSPACE_REVIEW_FILE_MAX_BYTES = 256 * 1024
export const WORKSPACE_REVIEW_TOTAL_MAX_BYTES = 2 * 1024 * 1024

type WorkspaceReviewSourceDependencies = {
  resolveTarget: (workspaceId: string) => Promise<WorkspaceReviewTarget>
  authorizePath: WorkspaceReviewAuthorizePath
  readGitMetadata: (target: WorkspaceReviewTarget) => Promise<WorkspaceReviewGit>
  inspectText?: (text: string, evidenceKey: string) => WorkspaceSensitiveSignal[]
}

function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

function evidenceKey(targetId: string, path: string, kind: WorkspaceReviewFile['kind']): string {
  return hash(JSON.stringify(['workspace-file-v1', targetId, path, kind]))
}

function failedFile(file: WorkspaceReviewFile, error: unknown): WorkspaceReviewFile {
  if (error instanceof WorkspaceReviewUnsafePathError) {
    return { ...file, status: 'unsafe', reason: error.message }
  }
  if (error instanceof NodeFileReadTooLargeError) {
    return {
      ...file,
      status: 'too_large',
      size: error.observedBytes,
      reason: '文件超过本次读取上限'
    }
  }
  const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT'
  return {
    ...file,
    status: missing ? 'missing' : 'unreadable',
    reason: missing ? '文件不存在' : '文件无法读取或在读取时变化'
  }
}

export class WorkspaceReviewSource {
  constructor(private readonly deps: WorkspaceReviewSourceDependencies) {}

  private async resolve(workspaceId: string) {
    const target = workspaceReviewTargetSchema.parse(await this.deps.resolveTarget(workspaceId))
    if (target.id !== workspaceId || target.hostId !== 'local' || !target.available) {
      throw new Error('工作区身份已变化或当前主机尚不支持读取此工作区')
    }
    const root = await resolveWorkspaceReviewRoot(target.rootPath, this.deps.authorizePath)
    return { target, root }
  }

  private async assertCurrent(target: WorkspaceReviewTarget, root: WorkspaceReviewRoot) {
    const current = await this.resolve(target.id)
    if (
      current.root.identity !== root.identity ||
      current.target.hostId !== target.hostId ||
      current.target.rootPath !== target.rootPath ||
      current.target.kind !== target.kind ||
      current.target.selector !== target.selector ||
      current.target.projectId !== target.projectId
    ) {
      throw new Error('工作区根目录或登记身份已变化，请重新选取工作区')
    }
  }

  private async readSelection(
    target: WorkspaceReviewTarget,
    root: WorkspaceReviewRoot,
    selected: WorkspaceReviewQuery['selection']['files'][number],
    maxBytes: number
  ): Promise<WorkspaceReviewFile> {
    let file: WorkspaceReviewFile = {
      ...selected,
      evidenceKey: evidenceKey(target.id, selected.path, selected.kind),
      status: 'unreadable',
      contentHash: null,
      size: null,
      mtimeMs: null,
      reason: null,
      signals: []
    }
    try {
      const path = normalizeWorkspaceReviewPath(selected.path)
      file = { ...file, path, evidenceKey: evidenceKey(target.id, path, selected.kind) }
      const { buffer, stats } = await readWorkspaceReviewFile(
        root,
        path,
        maxBytes,
        this.deps.authorizePath
      )
      const metadata = { ...file, size: buffer.length, mtimeMs: stats.mtimeMs }
      if (isBinaryBuffer(buffer)) {
        return { ...metadata, status: 'binary', reason: '二进制内容尚未纳入文本审阅' }
      }
      let text: string
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
      } catch {
        return { ...metadata, status: 'binary', reason: '文件不是有效 UTF-8 文本，尚未读取正文' }
      }
      return {
        ...metadata,
        status: 'read',
        contentHash: hash(buffer),
        signals: this.deps.inspectText?.(text, file.evidenceKey) ?? []
      }
    } catch (error) {
      return failedFile(file, error)
    }
  }

  private async git(target: WorkspaceReviewTarget): Promise<WorkspaceReviewGit> {
    if (target.kind === 'folder') {
      return {
        status: 'not_applicable',
        head: null,
        branch: null,
        changes: [],
        reason: '普通文件夹使用文件快照，不推断 Git 基线'
      }
    }
    try {
      return workspaceReviewGitSchema.parse(await this.deps.readGitMetadata(target))
    } catch {
      return {
        status: 'unavailable',
        head: null,
        branch: null,
        changes: [],
        reason: 'Git 版本及变更信息不可读取'
      }
    }
  }

  async capture(input: WorkspaceReviewQuery): Promise<WorkspaceReviewSnapshot> {
    const query = workspaceReviewQuerySchema.parse(input)
    const { target, root } = await this.resolve(query.workspaceId)
    const files: WorkspaceReviewFile[] = []
    let remaining = WORKSPACE_REVIEW_TOTAL_MAX_BYTES
    for (const selected of query.selection.files) {
      const file = await this.readSelection(
        target,
        root,
        selected,
        Math.min(WORKSPACE_REVIEW_FILE_MAX_BYTES, remaining)
      )
      files.push(file)
      if ((file.status === 'read' || file.status === 'binary') && file.size !== null) {
        remaining -= file.size
      }
    }
    const git = await this.git(target)
    await this.assertCurrent(target, root)
    const gaps = ['本次仅审阅明确选定的文件，不覆盖整个工作区或全部会话']
    if (files.some((file) => file.status !== 'read')) {
      gaps.push('部分选定文件未读取正文，请查看逐项缺口')
    }
    if (query.selection.files.some((file) => file.kind === 'verification')) {
      gaps.push('验证回执仅作为所选文件原文，尚未证明其对应当前工作区版本')
    }
    if (query.selection.sessionIds.length) {
      gaps.push('关联会话仅记录明确选择的 ID，本文件快照尚未纳入会话正文')
    }
    if (git.status === 'unavailable') {
      gaps.push('当前 Git 版本及变更信息不可核验')
    }
    if (query.selection.applicability === 'unconfirmed') {
      gaps.push('审阅依据的适用条件尚未确认')
    }
    if (files.some((file) => file.signals.length >= MAX_WORKSPACE_SENSITIVE_SIGNALS)) {
      gaps.push('敏感线索每个文件最多显示 100 项，原文预览仍需全文脱敏')
    }
    return workspaceReviewSnapshotSchema.parse({
      target,
      rootIdentity: root.identity,
      selection: query.selection,
      files,
      git,
      ruleVersion: 'workspace-evidence-v1',
      partial: true,
      gaps
    })
  }

  async readEvidence(input: WorkspaceReviewSnapshot, key: string) {
    const snapshot = workspaceReviewSnapshotSchema.parse(input)
    const file = snapshot.files.find((entry) => entry.evidenceKey === key)
    if (file?.status !== 'read' || !file.contentHash) {
      throw new Error('此版本没有可读取的文件证据')
    }
    const selected = snapshot.selection.files.some((entry) => {
      try {
        return entry.kind === file.kind && normalizeWorkspaceReviewPath(entry.path) === file.path
      } catch {
        return false
      }
    })
    if (!selected || evidenceKey(snapshot.target.id, file.path, file.kind) !== key) {
      throw new Error('文件不属于此审阅版本的明确选取范围')
    }
    const { target, root } = await this.resolve(snapshot.target.id)
    if (root.identity !== snapshot.rootIdentity) {
      throw new Error('工作区根目录已变化，请重新读取')
    }
    await this.assertCurrent(snapshot.target, root)
    const { buffer } = await readWorkspaceReviewFile(
      root,
      file.path,
      WORKSPACE_REVIEW_FILE_MAX_BYTES,
      this.deps.authorizePath
    )
    if (hash(buffer) !== file.contentHash) {
      throw new Error('原始文件已变化，不能将新内容作为旧版本证据')
    }
    await this.assertCurrent(target, root)
    return {
      text: redactWorkspaceText(buffer.toString('utf8')),
      truncated: false,
      sourcePath: file.path,
      byteOffset: 0
    }
  }
}
