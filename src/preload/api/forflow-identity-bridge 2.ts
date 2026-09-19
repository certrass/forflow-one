import { ipcRenderer } from 'electron'
import type { ForflowIdentityApi } from '../../shared/forflow-identity'

export const forflowIdentityApi: ForflowIdentityApi = {
  status: () => ipcRenderer.invoke('forflow:identity:status'),
  configure: (value) => ipcRenderer.invoke('forflow:identity:configure', value),
  login: (value) => ipcRenderer.invoke('forflow:identity:login', value),
  logout: () => ipcRenderer.invoke('forflow:identity:logout'),
  users: () => ipcRenderer.invoke('forflow:identity:users'),
  createUser: (value) => ipcRenderer.invoke('forflow:identity:createUser', value),
  setUserDisabled: (value) => ipcRenderer.invoke('forflow:identity:setUserDisabled', value),
  resetPassword: (value) => ipcRenderer.invoke('forflow:identity:resetPassword', value),
  audit: () => ipcRenderer.invoke('forflow:identity:audit')
}
