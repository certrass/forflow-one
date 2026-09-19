import type { GlobalSettings } from '../../../../shared/global-settings-types'
import type { TuiAgent } from '../../../../shared/tui-agent'

type CommandUpdate = {
  getSettings: () => GlobalSettings | null | undefined
  fallbackSettings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  agentId: TuiAgent
  value: string
  afterSave?: () => Promise<unknown>
}

export function createAgentCommandUpdateQueue(): (options: CommandUpdate) => Promise<void> {
  let pending: Promise<void> = Promise.resolve()
  return ({ getSettings, fallbackSettings, updateSettings, agentId, value, afterSave }) => {
    pending = pending
      .catch(() => {})
      .then(async () => {
        const overrides = { ...(getSettings() ?? fallbackSettings).agentCmdOverrides }
        const command = value.trim()
        if ((overrides[agentId] ?? '') !== command) {
          if (command) {
            overrides[agentId] = command
          } else {
            delete overrides[agentId]
          }
          await updateSettings({ agentCmdOverrides: overrides })
        }
        await afterSave?.()
      })
    return pending
  }
}
