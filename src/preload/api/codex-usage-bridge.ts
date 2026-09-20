import { ipcRenderer } from 'electron'
import { createUsageProviderApi } from '../usage-provider-api'
import type { PreloadApi } from '../api-types'

export const codexUsageApi = {
  ...createUsageProviderApi(ipcRenderer, 'codexUsage'),
  getAudit: (args) => ipcRenderer.invoke('codexUsage:getAudit', args)
} satisfies PreloadApi['codexUsage']
