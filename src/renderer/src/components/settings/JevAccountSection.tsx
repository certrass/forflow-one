import { useEffect, useState } from 'react'
import { JEV_MODEL } from '../../../../shared/jev-audit-types'
import type { ForflowModelAccount } from '../../../../shared/forflow-model-accounts'
import { translate } from '@/i18n/i18n'
import { ForflowModelAccountCard } from './ForflowModelAccountCard'

export function JevAccountSection(): React.JSX.Element {
  const api = window.api?.forflowModelAccounts
  const [account, setAccount] = useState<ForflowModelAccount | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    void api
      ?.list()
      .then((accounts) => {
        if (active) {
          const next = accounts.find((entry) => entry.provider === 'jev')
          setAccount(next ?? null)
          setError(!next)
        }
      })
      .catch(() => {
        if (active) {
          setError(true)
        }
      })
    return () => {
      active = false
    }
  }, [api])
  return (
    <details className="space-y-3 rounded-md border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        {translate('forflow.jev.configuration', 'Jev audit Beta · API configuration')}
      </summary>
      <p className="text-xs text-muted-foreground">
        {translate(
          'forflow.jev.accountScope',
          'The key is encrypted on this computer. Saving sends no request. Connection tests send fixed arithmetic text and may use API credits. Use a fixed model version.'
        )}
      </p>
      {error || !api ? (
        <p role="alert" className="text-sm text-destructive">
          {translate(
            'forflow.jev.accountUnavailable',
            'Account configuration is unavailable. Reopen this view to retry.'
          )}
        </p>
      ) : account ? (
        <ForflowModelAccountCard
          account={account}
          api={api}
          onChanged={setAccount}
          defaultModel={JEV_MODEL}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {translate('forflow.jev.loading', 'Loading…')}
        </p>
      )}
    </details>
  )
}
