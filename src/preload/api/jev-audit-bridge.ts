import { ipcRenderer } from 'electron'
import type { JevAuditApi } from '../../shared/jev-audit-types'

export const jevAuditApi: JevAuditApi = {
  prepare: (input) => ipcRenderer.invoke('forflow:jev:prepare', input),
  run: (input) => ipcRenderer.invoke('forflow:jev:run', input),
  list: (reviewId) => ipcRenderer.invoke('forflow:jev:list', reviewId),
  accept: (input) => ipcRenderer.invoke('forflow:jev:accept', input)
}
