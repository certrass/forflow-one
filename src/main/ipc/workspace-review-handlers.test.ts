import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CodexUsageStore } from '../codex-usage/store'
import { Store } from '../persistence'
import { OrcaRuntimeService } from '../runtime/orca-runtime'
import type { WorkspaceReviewQuery } from '../../shared/workspace-review-types'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  trusted: true,
  privateBuild: true,
  scanEnabled: false,
  workspaceId: 'a'.repeat(64),
  sessionId: 'b'.repeat(64),
  versionId: 'c'.repeat(64),
  targetId: 'wt2:local:registered',
  workspace: { list: vi.fn(), open: vi.fn(), get: vi.fn(), mutate: vi.fn() },
  session: { list: vi.fn(), open: vi.fn(), get: vi.fn(), mutate: vi.fn() },
  catalogList: vi.fn(),
  catalogResolve: vi.fn(),
  directoryFiles: vi.fn(),
  workspaceEvidence: vi.fn(),
  sessionEvidence: vi.fn(),
  sourceInput: vi.fn(),
  registerJev: vi.fn()
}))
vi.mock('electron', () => ({
  app: { getPath: () => '/synthetic-user-data' },
  ipcMain: { handle: mocks.handle }
}))
vi.mock('./ui', () => ({ isTrustedUIRenderer: () => mocks.trusted }))
vi.mock('../forflow/deployment-policy', () => ({
  isForflowPrivateDeployment: () => mocks.privateBuild
}))
vi.mock('./filesystem-auth', () => ({ resolveAuthorizedPath: vi.fn() }))
vi.mock('../persistence', () => ({ Store: class {} }))
vi.mock('../runtime/orca-runtime', () => ({ OrcaRuntimeService: class {} }))
vi.mock('../codex-usage/store', () => ({
  CodexUsageStore: class {
    getScanState() {
      return { enabled: mocks.scanEnabled }
    }
    getReviewSource = vi.fn()
  }
}))
vi.mock('./jev-audit-handlers', () => ({ registerJevAuditHandlers: mocks.registerJev }))
vi.mock('../codex-usage/codex-review-evidence', () => ({
  readCodexReviewEvidence: mocks.sessionEvidence
}))
vi.mock('../review/workspace-review-catalog', () => ({
  WorkspaceReviewCatalog: class {
    list = mocks.catalogList
    resolve = mocks.catalogResolve
    git = vi.fn()
  }
}))
vi.mock('../review/workspace-review-directory', () => ({
  listWorkspaceReviewFiles: mocks.directoryFiles
}))
vi.mock('../review/workspace-review-source', () => ({
  WorkspaceReviewSource: class {
    constructor(private readonly deps: { resolveTarget: (id: string) => unknown }) {}
    capture(query: WorkspaceReviewQuery) {
      return this.deps.resolveTarget(query.workspaceId)
    }
    readEvidence = mocks.workspaceEvidence
  }
}))
vi.mock('../review/workspace-review-input', () => ({
  readWorkspaceReviewInput: (
    query: WorkspaceReviewQuery,
    source: { capture: (input: WorkspaceReviewQuery) => unknown }
  ) => {
    mocks.sourceInput(query)
    return source.capture(query)
  }
}))
vi.mock('../codex-usage/codex-review-store', () => ({
  CodexReviewStore: class {
    private readonly methods
    constructor(
      file: string,
      private readonly source: (query: unknown) => unknown
    ) {
      this.methods = file.includes('workspace') ? mocks.workspace : mocks.session
    }
    has(id: string) {
      return this.methods === mocks.workspace && id === mocks.workspaceId
    }
    list() {
      return this.methods.list()
    }
    get(id: string) {
      return this.methods.get(id)
    }
    mutate(input: unknown) {
      return this.methods.mutate(input)
    }
    open(input: unknown) {
      this.methods.open(input)
      return this.source(input)
    }
  }
}))

import { registerCodexReviewHandlers } from './codex-review-handlers'

const frame = {}
const event = { senderFrame: frame, sender: { mainFrame: frame } }
const query = {
  workspaceId: mocks.targetId,
  focus: '核对所选资料',
  selection: {
    files: [{ path: 'src/main.ts', kind: 'code' }],
    sessionIds: [],
    policyReference: '',
    applicability: 'unconfirmed',
    applicabilityReason: ''
  }
}
const mutation = {
  id: mocks.workspaceId,
  versionId: mocks.versionId,
  expectedRevision: 0,
  action: { type: 'comment', text: '需要补证' }
}
const evidence = { id: mocks.workspaceId, versionId: mocks.versionId, evidenceKey: 'known-file' }
function invoke(operation: string, input?: unknown, sender = event): unknown {
  const handler = mocks.handle.mock.calls.find(
    ([channel]) => channel === `codexUsage:${operation}`
  )?.[1]
  if (!handler) {
    throw new Error('Handler missing')
  }
  return handler(sender, input)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.trusted = true
  mocks.privateBuild = true
  mocks.scanEnabled = false
  mocks.workspace.get.mockReturnValue({
    id: mocks.workspaceId,
    versions: [
      {
        id: mocks.versionId,
        workspace: { files: [{ evidenceKey: 'known-file' }] }
      }
    ]
  })
  mocks.session.get.mockReturnValue({ id: mocks.sessionId, versions: [{ id: mocks.versionId }] })
  mocks.workspace.list.mockReturnValue(['workspace-history'])
  mocks.workspaceEvidence.mockResolvedValue({ text: '[redacted]', truncated: false })
  mocks.catalogResolve.mockImplementation((id: string) => {
    if (id !== mocks.targetId) {
      throw new Error('Workspace is not registered')
    }
    return { id, rootPath: '/registered/root', hostId: 'local' }
  })
  const store = new Store()
  const runtime = new OrcaRuntimeService(store)
  registerCodexReviewHandlers(new CodexUsageStore(store), { store, runtime })
})

describe('workspace Review IPC authority and routing', () => {
  it.each([
    ['listWorkspaceReviewTargets', undefined],
    ['listWorkspaceReviewFiles', { workspaceId: mocks.targetId, directory: '' }],
    ['listWorkspaceReviews', undefined],
    ['openWorkspaceReview', query],
    ['getReview', mocks.workspaceId],
    ['updateReview', mutation],
    ['readReviewEvidence', evidence]
  ])('guards %s before returning or mutating workspace content', (operation, input) => {
    if (typeof operation !== 'string') {
      throw new Error('Bad fixture')
    }
    mocks.trusted = false
    expect(() => invoke(operation, input)).toThrow('桌面主界面')
    mocks.trusted = true
    mocks.privateBuild = false
    expect(() => invoke(operation, input)).toThrow('桌面主界面')
    mocks.privateBuild = true
    expect(() => invoke(operation, input, { ...event, senderFrame: {} })).toThrow('桌面主界面')
    for (const spy of [
      mocks.catalogList,
      mocks.catalogResolve,
      mocks.directoryFiles,
      ...Object.values(mocks.workspace),
      mocks.workspaceEvidence,
      mocks.sourceInput
    ]) {
      expect(spy).not.toHaveBeenCalled()
    }
  })

  it('validates directory browsing input and strips arbitrary filesystem roots', () => {
    const input = { workspaceId: mocks.targetId, directory: 'src' }
    invoke('listWorkspaceReviewFiles', { ...input, rootPath: '/arbitrary/root' })
    expect(mocks.directoryFiles).toHaveBeenCalledWith(input, {
      resolveTarget: expect.any(Function),
      authorizePath: expect.any(Function)
    })
    mocks.directoryFiles.mockClear()
    for (const invalid of [
      { directory: '' },
      { ...input, directory: 1 },
      { ...input, workspaceId: '' }
    ]) {
      expect(() => invoke('listWorkspaceReviewFiles', invalid)).toThrow()
    }
    expect(mocks.directoryFiles).not.toHaveBeenCalled()
  })

  it('strips a supplied root, target and per-file source path before resolving a registered ID', () => {
    const input = {
      ...query,
      rootPath: '/arbitrary/root',
      target: { rootPath: '/arbitrary/root' },
      selection: {
        ...query.selection,
        files: [{ path: 'src/main.ts', kind: 'code', sourcePath: '/arbitrary/secret' }]
      }
    }
    expect(invoke('openWorkspaceReview', input)).toEqual({
      id: mocks.targetId,
      rootPath: '/registered/root',
      hostId: 'local'
    })
    expect(mocks.sourceInput).toHaveBeenCalledExactlyOnceWith(query)
    expect(mocks.catalogResolve).toHaveBeenCalledExactlyOnceWith(mocks.targetId)
    expect(mocks.session.open).not.toHaveBeenCalled()
  })

  it('does not accept an arbitrary filesystem path as a registered workspace identity', () => {
    expect(() =>
      invoke('openWorkspaceReview', { ...query, workspaceId: '/arbitrary/root' })
    ).toThrow('not registered')
    expect(mocks.catalogResolve).toHaveBeenCalledWith('/arbitrary/root')
    expect(mocks.workspaceEvidence).not.toHaveBeenCalled()
  })

  it('rejects malformed selections and unexplained not-applicable claims before source loading', () => {
    for (const selection of [
      { ...query.selection, files: [] },
      { ...query.selection, applicability: 'not_applicable', applicabilityReason: '' },
      { ...query.selection, files: [{ path: 'main.ts', kind: 'arbitrary' }] }
    ]) {
      expect(() => invoke('openWorkspaceReview', { ...query, selection })).toThrow()
    }
    expect(mocks.sourceInput).not.toHaveBeenCalled()
  })

  it('routes workspace history, get and mutation to the workspace store', () => {
    expect(invoke('listWorkspaceReviews')).toEqual(['workspace-history'])
    invoke('getReview', mocks.workspaceId)
    invoke('updateReview', mutation)
    expect(mocks.workspace.get).toHaveBeenCalledWith(mocks.workspaceId)
    expect(mocks.workspace.mutate).toHaveBeenCalledExactlyOnceWith(mutation)
    expect(mocks.session.get).not.toHaveBeenCalled()
    expect(mocks.session.mutate).not.toHaveBeenCalled()
  })

  it('routes registered file evidence independently of Codex scanning and rejects result-part misuse', async () => {
    await expect(
      invoke('readReviewEvidence', { ...evidence, sourcePath: '/arbitrary/secret' })
    ).resolves.toMatchObject({ text: '[redacted]' })
    expect(mocks.workspaceEvidence).toHaveBeenCalledExactlyOnceWith(
      { files: [{ evidenceKey: 'known-file' }] },
      'known-file'
    )
    expect(mocks.sessionEvidence).not.toHaveBeenCalled()
    await expect(invoke('readReviewEvidence', { ...evidence, part: 'result' })).rejects.toThrow(
      '没有工具返回值'
    )
  })

  it('does not let a missing file key bypass the Codex scan-read setting', async () => {
    await expect(
      invoke('readReviewEvidence', { ...evidence, evidenceKey: 'not-a-file' })
    ).rejects.toThrow('先启用')
    expect(mocks.workspaceEvidence).not.toHaveBeenCalled()
    expect(mocks.sessionEvidence).not.toHaveBeenCalled()
  })

  it('keeps ordinary session reads and mutations out of the workspace store', () => {
    invoke('getReview', mocks.sessionId)
    invoke('updateReview', { ...mutation, id: mocks.sessionId })
    expect(mocks.session.get).toHaveBeenCalledWith(mocks.sessionId)
    expect(mocks.session.mutate).toHaveBeenCalledWith({ ...mutation, id: mocks.sessionId })
    expect(mocks.workspace.get).not.toHaveBeenCalled()
    expect(mocks.workspace.mutate).not.toHaveBeenCalled()
  })
})
