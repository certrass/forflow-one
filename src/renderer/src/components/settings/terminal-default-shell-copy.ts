import { translate } from '@/i18n/i18n'
import type { SettingsSearchEntry } from './settings-search'

export function terminalDefaultShellCopy() {
  return {
    title: translate('forflow.terminalShell.title', 'Default terminal shell'),
    description: translate(
      'forflow.terminalShell.description',
      'Choose the shell for new local terminal panes.'
    ),
    custom: translate('forflow.terminalShell.custom', 'Custom shell'),
    executable: translate('forflow.terminalShell.executable', 'Custom shell executable'),
    systemDefault: translate('forflow.terminalShell.systemDefault', 'System default'),
    help: translate(
      'forflow.terminalShell.help',
      'Enter a shell name on PATH or an executable path. New terminals start it as a login shell. An empty value uses the system shell.'
    ),
    failed: translate(
      'forflow.terminalShell.failed',
      'Could not check this shell path. Check the connection and try again.'
    )
  }
}

export function getTerminalDefaultShellSearchEntry(): SettingsSearchEntry {
  const c = terminalDefaultShellCopy()
  return {
    title: c.title,
    description: c.description,
    keywords: ['shell', 'terminal', 'default', 'custom', 'fish', 'zsh', 'bash', 'nushell', c.custom]
  }
}
