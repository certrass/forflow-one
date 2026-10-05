import { translate } from './i18n'
import type { KeybindingDefinition } from '../../../shared/keybindings'

export function localizedKeybindingGroup(group: string): string {
  return translate(`forflow.shortcuts.groups.${group.replaceAll(' ', '').toLowerCase()}`, group)
}

export function localizedKeybinding(definition: KeybindingDefinition): KeybindingDefinition {
  const agent = definition.id.startsWith('tab.newAgent.') ? definition.title.slice(4, -4) : null
  const title = agent
    ? translate('forflow.shortcuts.newAgent', 'New {{agent}} tab', { agent })
    : translate(`forflow.shortcuts.actions.${definition.id}`, definition.title)
  const group = localizedKeybindingGroup(definition.group)
  if (title === definition.title && group === definition.group) {
    return definition
  }
  return {
    ...definition,
    title,
    group,
    searchKeywords: [...definition.searchKeywords, definition.title, definition.group]
  }
}
