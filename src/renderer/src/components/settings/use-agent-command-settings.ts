import { useState } from 'react'
import { toast } from 'sonner'
import type { GlobalSettings } from '../../../../shared/global-settings-types'
import type { TuiAgent } from '../../../../shared/tui-agent'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { createAgentCommandUpdateQueue } from './agent-command-settings'

const enqueueCommandUpdate = createAgentCommandUpdateQueue()

export function useAgentCommandSettings(
  settings: GlobalSettings,
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>,
  refresh: () => Promise<unknown>,
  runtimeEnvironmentId?: string | null
): { isSaving: boolean; saveCommand: (agentId: TuiAgent, value: string) => Promise<void> } {
  const [pendingCount, setPendingCount] = useState(0)
  const saveCommand = async (agentId: TuiAgent, value: string): Promise<void> => {
    setPendingCount((count) => count + 1)
    let saved = false
    try {
      await enqueueCommandUpdate({
        getSettings: () => useAppStore.getState().settings,
        fallbackSettings: settings,
        updateSettings,
        agentId,
        value,
        afterSave: async () => {
          saved = true
          const state = useAppStore.getState()
          if (runtimeEnvironmentId) {
            state.clearRuntimeDetectedAgents(runtimeEnvironmentId)
          } else {
            state.clearLocalDetectedAgents()
          }
          await refresh()
        }
      })
    } catch {
      toast.error(
        saved
          ? translate(
              'settings.agentCommand.detectFailed',
              'Command saved. Detection failed; retry Refresh before launching.'
            )
          : translate('settings.agentCommand.saveFailed', 'Unable to save the agent command.')
      )
    } finally {
      setPendingCount((count) => count - 1)
    }
  }
  return { isSaving: pendingCount > 0, saveCommand }
}
