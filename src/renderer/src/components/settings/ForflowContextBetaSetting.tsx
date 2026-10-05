import type { GlobalSettings } from '../../../../shared/global-settings-types'
import { translate } from '@/i18n/i18n'
import { Label } from '../ui/label'
import { SearchableSetting } from './SearchableSetting'
import { SettingsSwitch } from './SettingsFormControls'

export function getForflowContextBetaSearchEntry() {
  return {
    title: translate('forflow.contextBeta.title', 'Copy conversation'),
    description: translate(
      'forflow.contextBeta.description',
      'Copy an excerpt from your Codex conversation to continue in a new chat.'
    ),
    keywords: ['copy', 'conversation', 'context', 'handoff', '复制', '对话', '接续', '交接'],
    targetSectionId: 'forflow-context-beta'
  }
}

export function ForflowContextBetaSetting({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element {
  const entry = getForflowContextBetaSearchEntry()
  return (
    <SearchableSetting {...entry} id={entry.targetSectionId} className="space-y-3 py-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <Label>{entry.title}</Label>
          <p className="text-xs text-muted-foreground">{entry.description}</p>
          <p className="text-xs text-muted-foreground">
            {translate(
              'forflow.contextBeta.location',
              'Show “Copy conversation” above the Codex chat composer.'
            )}
          </p>
        </div>
        <SettingsSwitch
          checked={settings.forflowContextPreviewBeta === true}
          ariaLabel={entry.title}
          onChange={() =>
            updateSettings({
              forflowContextPreviewBeta: settings.forflowContextPreviewBeta !== true
            })
          }
        />
      </div>
    </SearchableSetting>
  )
}
