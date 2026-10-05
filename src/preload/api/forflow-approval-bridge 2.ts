import { ipcRenderer } from 'electron'
import type { ForflowApprovalApi } from '../../shared/forflow-approval'

export const forflowApprovalApi: ForflowApprovalApi = {
  pending: () => ipcRenderer.invoke('forflow:approval:pending'),
  decide: (id, allow) => ipcRenderer.invoke('forflow:approval:decide', id, allow),
  onChanged: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('forflow:approval:changed', listener)
    return () => ipcRenderer.removeListener('forflow:approval:changed', listener)
  }
}
