import { ipcRenderer } from 'electron'
import type { ForflowModelAccountsApi } from '../../shared/forflow-model-accounts'

export const forflowModelAccountsApi: ForflowModelAccountsApi = {
  list: () => ipcRenderer.invoke('forflow:modelAccounts:list'),
  save: (input) => ipcRenderer.invoke('forflow:modelAccounts:save', input),
  remove: (provider) => ipcRenderer.invoke('forflow:modelAccounts:remove', provider),
  test: (provider) => ipcRenderer.invoke('forflow:modelAccounts:test', provider)
}
