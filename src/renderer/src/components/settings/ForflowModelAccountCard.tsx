import { useId, useState } from 'react'
import {
  FORFLOW_MODEL_PROVIDERS,
  type ForflowModelAccount,
  type ForflowModelAccountsApi
} from '../../../../shared/forflow-model-accounts'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { SettingsBadge } from './SettingsFormControls'

export function ForflowModelAccountCard({
  account,
  api,
  onChanged
}: {
  account: ForflowModelAccount
  api: ForflowModelAccountsApi
  onChanged: (account: ForflowModelAccount) => void
}): React.JSX.Element {
  const id = useId()
  const provider = FORFLOW_MODEL_PROVIDERS[account.provider]
  const [model, setModel] = useState(account.model ?? '')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const dirty = model.trim() !== (account.model ?? '') || apiKey.length > 0
  const run = async (action: 'save' | 'test' | 'remove'): Promise<void> => {
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      if (action === 'save') {
        const next = await api.save({
          provider: account.provider,
          model: model.trim(),
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {})
        })
        onChanged(next)
        setModel(next.model ?? '')
        setApiKey('')
        setMessage(translate('forflow.modelAccounts.saved', '已保存，尚未验证连接。'))
      } else if (action === 'remove') {
        await api.remove(account.provider)
        onChanged({ provider: account.provider, state: 'missing', model: null })
        setModel('')
        setApiKey('')
        setMessage(translate('forflow.modelAccounts.removed', '已移除此 API 配置。'))
      } else {
        const result = await api.test(account.provider)
        setMessage(result.message)
        setFailed(!result.ok)
      }
    } catch {
      setFailed(true)
      setMessage(
        translate(
          'forflow.modelAccounts.actionFailed',
          '操作未完成。请检查密钥库是否解锁、模型名称及配置后重试。'
        )
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section aria-label={provider.label} className="space-y-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium">{provider.label}</h4>
        <SettingsBadge tone="muted">
          {account.state === 'configured'
            ? translate('forflow.modelAccounts.configured', '已保存 API 配置')
            : account.state === 'locked'
              ? translate('forflow.modelAccounts.locked', '密钥库锁定或配置无法读取')
              : translate('forflow.modelAccounts.missing', '尚未配置')}
        </SettingsBadge>
      </div>
      <p className="break-all font-mono text-xs text-muted-foreground">{provider.baseUrl}</p>
      <div className="space-y-2">
        <Label htmlFor={`${id}-model`}>
          {translate('forflow.modelAccounts.model', '模型名称')}
        </Label>
        <Input
          id={`${id}-model`}
          value={model}
          disabled={busy}
          placeholder={provider.modelExample}
          onChange={(event) => {
            setModel(event.target.value)
            setMessage('')
          }}
          spellCheck={false}
          maxLength={160}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-key`}>API Key</Label>
        <Input
          id={`${id}-key`}
          type="password"
          value={apiKey}
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
          maxLength={4096}
          placeholder={
            account.state === 'configured'
              ? translate('forflow.modelAccounts.keepKey', '留空保留已保存的密钥')
              : translate('forflow.modelAccounts.enterKey', '填写开放平台 API Key')
          }
          onChange={(event) => {
            setApiKey(event.target.value)
            setMessage('')
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={
            busy || !model.trim() || (!apiKey.trim() && account.state !== 'configured') || !dirty
          }
          onClick={() => void run('save')}
        >
          {translate('forflow.modelAccounts.save', '保存配置')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || dirty || account.state !== 'configured'}
          onClick={() => void run('test')}
        >
          {translate('forflow.modelAccounts.test', '测试连接')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy || account.state === 'missing'}
          onClick={() => void run('remove')}
        >
          {translate('forflow.modelAccounts.remove', '移除配置')}
        </Button>
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline"
        >
          {translate('forflow.modelAccounts.docs', '官方接入文档')}
        </a>
      </div>
      {busy ? (
        <p role="status" className="text-xs text-muted-foreground">
          {translate('forflow.modelAccounts.busy', '处理中…')}
        </p>
      ) : null}
      {message ? (
        <p role={failed ? 'alert' : 'status'} className="text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}
    </section>
  )
}
