import { ipcRenderer } from 'electron'
import type { ForflowWorkBuddyAccountApi } from '../../shared/forflow-workbuddy-account'

export const forflowWorkBuddyAccountApi: ForflowWorkBuddyAccountApi = {
  getStatus: () => ipcRenderer.invoke('forflow:workbuddyAccount:getStatus')
}
