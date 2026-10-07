import { useRef, useState } from 'react'
import type { GlobalSettings } from '../../../../shared/global-settings-types'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { Input } from '../ui/input'
import { SettingsSegmentedControl, SettingsSubsectionHeader } from './SettingsFormControls'
import { terminalDefaultShellCopy } from './terminal-default-shell-copy'
import { TerminalShellArguments } from './TerminalShellArguments'

export function TerminalDefaultShellSection({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element {
  const c = terminalDefaultShellCopy()
  const [editingCustom, setEditingCustom] = useState(false)
  const [validation, setValidation] = useState<{ shell: string; message: string } | null>(null)
  const requestId = useRef(0)
  const mounted = useMountedRef()
  const configuredShell = settings.terminalDefaultShell?.trim() ?? ''
  const currentShell = useRef(configuredShell)
  currentShell.current = configuredShell
  const shellMode = editingCustom || configuredShell ? 'custom' : 'system'
  const systemShell =
    (typeof window !== 'undefined' ? window.api?.platform?.get?.().shell?.trim() : '') ||
    c.systemDefault
  const error = validation?.shell === configuredShell ? validation.message : null

  function clearValidation(): void {
    requestId.current++
    setValidation(null)
  }

  async function validateShell(): Promise<void> {
    const shell = configuredShell
    const request = ++requestId.current
    if (!shell.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(shell)) {
      setValidation(null)
      return
    }
    let message: string | null = null
    try {
      if (!(await window.api.shell.pathExists(shell))) {
        message = translate(
          'forflow.terminalShell.notFound',
          'Shell path not found: {{path}}. Choose a file on this computer or switch to the system shell.',
          { path: shell }
        )
      }
    } catch {
      message = c.failed
    }
    if (mounted.current && requestId.current === request && currentShell.current === shell) {
      setValidation(message ? { shell, message } : null)
    }
  }

  return (
    <section className="space-y-3">
      <SettingsSubsectionHeader title={c.title} description={c.description} />
      <div className="space-y-3">
        <SettingsSegmentedControl
          ariaLabel={c.title}
          value={shellMode}
          onChange={(value) => {
            clearValidation()
            setEditingCustom(value === 'custom')
            if (value === 'system') {
              updateSettings({ terminalDefaultShell: '', terminalDefaultShellArgs: undefined })
            }
          }}
          options={[
            {
              value: 'system',
              label: translate('forflow.terminalShell.system', 'System shell ({{shell}})', {
                shell: systemShell
              })
            },
            { value: 'custom', label: c.custom }
          ]}
        />
        {shellMode === 'custom' ? (
          <div className="space-y-1.5">
            <Input
              value={settings.terminalDefaultShell ?? ''}
              placeholder="fish, nu, /bin/zsh"
              onChange={(event) => {
                clearValidation()
                setEditingCustom(true)
                updateSettings({ terminalDefaultShell: event.target.value.trimStart() })
              }}
              onBlur={() => void validateShell()}
              className="w-full"
              aria-label={c.executable}
              aria-invalid={error != null}
              aria-describedby={error ? 'default-shell-error' : 'default-shell-help'}
            />
            <p id="default-shell-help" className="text-xs text-muted-foreground">
              {c.help}
            </p>
            {error ? (
              <p id="default-shell-error" role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
            <TerminalShellArguments
              value={settings.terminalDefaultShellArgs}
              onChange={(terminalDefaultShellArgs) => updateSettings({ terminalDefaultShellArgs })}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
