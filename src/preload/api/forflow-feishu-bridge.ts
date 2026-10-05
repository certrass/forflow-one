import { ipcRenderer } from 'electron'
import type { ForflowFeishuApi } from '../../shared/forflow-feishu'

export const forflowFeishuApi: ForflowFeishuApi = {
  status: () => ipcRenderer.invoke('forflow:feishu:status'),
  connect: (appId) => ipcRenderer.invoke('forflow:feishu:connect', appId),
  disconnect: () => ipcRenderer.invoke('forflow:feishu:disconnect'),
  tasklists: (token) => ipcRenderer.invoke('forflow:feishu:tasklists', token),
  tasks: (query) => ipcRenderer.invoke('forflow:feishu:tasks', query),
  task: (id) => ipcRenderer.invoke('forflow:feishu:task', id)
}
