import { ipcRenderer } from 'electron'
import { createUsageProviderApi } from '../usage-provider-api'
import type { PreloadApi } from '../api-types'

export const codexUsageApi = {
  ...createUsageProviderApi(ipcRenderer, 'codexUsage'),
  listWorkspaceReviewTargets: () => ipcRenderer.invoke('codexUsage:listWorkspaceReviewTargets'),
  listWorkspaceReviewFiles: (args) =>
    ipcRenderer.invoke('codexUsage:listWorkspaceReviewFiles', args),
  listWorkspaceReviews: () => ipcRenderer.invoke('codexUsage:listWorkspaceReviews'),
  openWorkspaceReview: (args) => ipcRenderer.invoke('codexUsage:openWorkspaceReview', args),
  getAudit: (args) => ipcRenderer.invoke('codexUsage:getAudit', args),
  getAnalytics: (args) => ipcRenderer.invoke('codexUsage:getAnalytics', args),
  openReview: (args) => ipcRenderer.invoke('codexUsage:openReview', args),
  getReview: (id) => ipcRenderer.invoke('codexUsage:getReview', id),
  updateReview: (args) => ipcRenderer.invoke('codexUsage:updateReview', args),
  readReviewEvidence: (args) => ipcRenderer.invoke('codexUsage:readReviewEvidence', args)
} satisfies PreloadApi['codexUsage']
