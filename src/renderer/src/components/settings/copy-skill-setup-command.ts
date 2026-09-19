import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'

export async function copySkillSetupCommand(command: string): Promise<void> {
  try {
    await window.api.ui.writeClipboardText(command)
    toast.success(
      translate('auto.components.settings.AgentSkillSetupPanel.copiedCommand', 'Copied command.')
    )
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : translate(
            'auto.components.settings.AgentSkillSetupPanel.failedToCopyCommand',
            'Failed to copy command.'
          )
    )
  }
}
