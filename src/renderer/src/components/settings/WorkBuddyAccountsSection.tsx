import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { AgentIcon } from '@/lib/agent-catalog'
import type { WorkBuddyAccountStatus } from '../../../../shared/forflow-workbuddy-account'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { SettingsSubsectionHeader } from './SettingsFormControls'

function accountMessage(state: WorkBuddyAccountStatus['state'] | 'unsupported'): string {
  switch (state) {
    case 'not-installed':
      return translate(
        'forflow.workbuddyAccount.notInstalled',
        'WorkBuddy was not found. Install it and sign in, then refresh here.'
      )
    case 'signed-out':
      return translate(
        'forflow.workbuddyAccount.signedOut',
        'Sign in to WorkBuddy, then refresh your account here.'
      )
    case 'unavailable':
      return translate('forflow.workbuddyAccount.failed', 'Could not read your account. Try again.')
    case 'unsupported':
      return translate(
        'forflow.workbuddyAccount.update',
        'Update Forflow One to view your WorkBuddy account.'
      )
    case 'local-only':
      return translate(
        'forflow.workbuddyAccount.localOnly',
        'Switch to this device to view your WorkBuddy account.'
      )
    case 'signed-in':
      return translate(
        'forflow.workbuddyAccount.switchHint',
        'To switch accounts, sign in to WorkBuddy with another account, then refresh here.'
      )
  }
}

function LocalWorkBuddyAccount(): React.JSX.Element {
  const api = window.api.forflowWorkBuddyAccount
  const [status, setStatus] = useState<WorkBuddyAccountStatus | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!api) {
      return
    }
    let active = true
    void api
      .getStatus()
      .then((next) => {
        if (active) {
          setStatus(next)
        }
      })
      .catch(() => {
        if (active) {
          setStatus({ state: 'unavailable' })
        }
      })
    return () => {
      active = false
    }
  }, [api, attempt])
  const loading = Boolean(api && !status)
  const failed = status?.state === 'unavailable'
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4">
        <div className="min-w-0 flex-1 space-y-1" aria-live="polite">
          {status?.state === 'signed-in' ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="break-all text-sm font-medium">
                  {status.name || translate('forflow.workbuddyAccount.current', 'Current account')}
                </span>
                <Badge variant="secondary">
                  {translate('forflow.workbuddyAccount.signedIn', 'Signed in')}
                </Badge>
              </div>
              {status.organization || status.accountType ? (
                <p className="break-words text-sm text-muted-foreground">
                  {status.organization ||
                    (status.accountType === 'personal'
                      ? translate('forflow.workbuddyAccount.personal', 'Personal account')
                      : translate('forflow.workbuddyAccount.enterprise', 'Enterprise account'))}
                </p>
              ) : null}
              <p className="break-all text-xs text-muted-foreground">
                {translate('forflow.workbuddyAccount.id', 'Account ID: {{id}}', {
                  id: status.userId
                })}
              </p>
            </>
          ) : (
            <p role={failed ? 'alert' : 'status'} className="text-sm text-muted-foreground">
              {loading
                ? translate('forflow.workbuddyAccount.loading', 'Reading account…')
                : accountMessage(api ? (status?.state ?? 'unavailable') : 'unsupported')}
            </p>
          )}
        </div>
        {api ? (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => {
              setStatus(null)
              setAttempt((value) => value + 1)
            }}
          >
            <RefreshCw aria-hidden="true" />
            {failed
              ? translate('forflow.workbuddyAccount.retry', 'Retry')
              : translate('forflow.workbuddyAccount.refresh', 'Refresh account')}
          </Button>
        ) : null}
      </div>
      {status?.state === 'signed-in' ? (
        <p className="text-xs text-muted-foreground">{accountMessage('signed-in')}</p>
      ) : null}
    </div>
  )
}

export function WorkBuddyAccountsSection({ localHost }: { localHost: boolean }): React.JSX.Element {
  return (
    <section aria-label="WorkBuddy" className="space-y-4">
      <SettingsSubsectionHeader
        title={
          <span className="flex items-center gap-2">
            <AgentIcon agent="workbuddy" size={16} />
            WorkBuddy
          </span>
        }
        description={translate(
          'forflow.workbuddyAccount.description',
          'Use the account signed in to WorkBuddy on this device.'
        )}
      />
      {localHost ? (
        <LocalWorkBuddyAccount />
      ) : (
        <p className="text-sm text-muted-foreground">{accountMessage('local-only')}</p>
      )}
    </section>
  )
}
