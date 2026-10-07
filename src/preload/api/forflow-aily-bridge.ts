import { ipcRenderer } from 'electron'
import type { ForflowAilyApi } from '../../shared/forflow-aily'

export const forflowAilyApi: ForflowAilyApi = {
  status: () => ipcRenderer.invoke('forflow:aily:status'),
  discover: () => ipcRenderer.invoke('forflow:aily:discover'),
  connect: (chatId) => ipcRenderer.invoke('forflow:aily:connect', chatId),
  disconnect: () => ipcRenderer.invoke('forflow:aily:disconnect'),
  messages: (token) => ipcRenderer.invoke('forflow:aily:messages', token),
  send: (input) => ipcRenderer.invoke('forflow:aily:send', input)
}
