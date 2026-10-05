import type { GlobalSettings } from '../../../../shared/global-settings-types'
import { translate } from '@/i18n/i18n'
import { Label } from '../ui/label'
import { SearchableSetting } from './SearchableSetting'
import { SettingsSwitch } from './SettingsFormControls'

export function getForflowContextBetaSearchEntry() {
  return {
    title: translate('forflow.contextBeta.title', 'Context handoff preview · Beta'),
    description: translate(
      'forflow.contextBeta.description',
      'Preview a bounded handoff from the current Codex conversation. No model calls, automatic sending or long-term memory writes.'
    ),
    keywords: ['Beta', 'memory', 'context', 'handoff', '记忆', '接续', '交接', '审计'],
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
              'Enable to show “Handoff preview” above the Codex chat composer. Off by default; existing sessions and task states stay unchanged.'
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
