import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'
import type { Store } from '../persistence'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'
import type { CodexUsageStore } from '../codex-usage/store'
import { CodexReviewStore } from '../codex-usage/codex-review-store'
import { workspaceReviewQuerySchema } from '../../shared/workspace-review-types'
import { WorkspaceReviewCatalog } from '../review/workspace-review-catalog'
import { WorkspaceReviewSource } from '../review/workspace-review-source'
import { readWorkspaceReviewInput } from '../review/workspace-review-input'
import { inspectWorkspaceText } from '../review/workspace-sensitive-signals'
import { resolveAuthorizedPath } from './filesystem-auth'
import { isForflowPrivateDeployment } from '../forflow/deployment-policy'
import { isTrustedUIRenderer } from './ui'

export type WorkspaceReviewDependencies = { store: Store; runtime: OrcaRuntimeService }

export function assertWorkspaceReviewRenderer(event: IpcMainInvokeEvent): void {
  if (
    !isForflowPrivateDeployment() ||
    event.senderFrame !== event.sender.mainFrame ||
    !isTrustedUIRenderer(event.sender)
  ) {
    throw new Error('工作区审阅仅支持 Forflow 桌面主界面。')
  }
}

export function registerWorkspaceReviewHandlers(
  deps: WorkspaceReviewDependencies,
  usage: CodexUsageStore
) {
  const catalog = new WorkspaceReviewCatalog(deps.store, deps.runtime)
  const source = new WorkspaceReviewSource({
    resolveTarget: (id) => catalog.resolve(id),
    authorizePath: (path) => resolveAuthorizedPath(path, deps.store),
    readGitMetadata: (target) => catalog.git(target),
    inspectText: inspectWorkspaceText
  })
  const reviews = new CodexReviewStore(
    join(app.getPath('userData'), 'forflow-workspace-reviews.json'),
    (query) => {
      if (!('workspaceId' in query)) {
        throw new Error('项目审阅需要选择工作区')
      }
      return readWorkspaceReviewInput(query, source, usage)
    }
  )
  ipcMain.handle('codexUsage:listWorkspaceReviewTargets', (event) => {
    assertWorkspaceReviewRenderer(event)
    return catalog.list()
  })
  ipcMain.handle('codexUsage:listWorkspaceReviews', (event) => {
    assertWorkspaceReviewRenderer(event)
    return reviews.list()
  })
  ipcMain.handle('codexUsage:openWorkspaceReview', (event, input: unknown) => {
    assertWorkspaceReviewRenderer(event)
    return reviews.open(workspaceReviewQuerySchema.parse(input))
  })
  return { reviews, source }
}
