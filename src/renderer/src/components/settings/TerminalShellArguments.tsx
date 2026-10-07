import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { Textarea } from '../ui/textarea'
import { SettingsSegmentedControl } from './SettingsFormControls'

export function TerminalShellArguments({
  value,
  onChange
}: {
  value: string[] | undefined
  onChange: (value: string[] | undefined) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState(value ?? [])
  const mode = value === undefined ? 'default' : 'custom'
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm">
          {translate('forflow.terminalShell.advanced', 'Advanced')}
          <ChevronDown />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">
            {mode === 'default'
              ? translate(
                  'forflow.terminalShell.loginArgs',
                  'Starts the shell as a login shell with -l.'
                )
              : translate(
                  'forflow.terminalShell.customArgsHelp',
                  'Enter one argument per line. Leave it empty to pass no arguments.'
                )}
          </p>
          <SettingsSegmentedControl
            ariaLabel={translate('forflow.terminalShell.argumentMode', 'Shell argument mode')}
            value={mode}
            onChange={(next) => onChange(next === 'default' ? undefined : draft)}
            options={[
              {
                value: 'default',
                label: translate('forflow.terminalShell.defaultArgs', '-l (default)')
              },
              {
                value: 'custom',
                label: translate('forflow.terminalShell.customArgs', 'Custom args')
              }
            ]}
          />
          {mode === 'custom' ? (
            <Textarea
              value={draft.join('\n')}
              onChange={(event) => {
                const next = event.target.value.split('\n')
                setDraft(next)
                onChange(next.filter((argument) => argument.length > 0))
              }}
              placeholder={'--rcfile\n/path/to/rcfile'}
              spellCheck={false}
              aria-label={translate(
                'forflow.terminalShell.arguments',
                'Shell arguments, one per line'
              )}
            />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
