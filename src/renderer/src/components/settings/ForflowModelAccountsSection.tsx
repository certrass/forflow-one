import { useEffect, useState } from 'react'
import type { ForflowModelAccount } from '../../../../shared/forflow-model-accounts'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import { SettingsSubsectionHeader } from './SettingsFormControls'
import { ForflowModelAccountCard } from './ForflowModelAccountCard'
import { JevAccountSection } from './JevAccountSection'

export function ForflowModelAccountsSection({
  localHost
}: {
  localHost: boolean
}): React.JSX.Element {
  const [accounts, setAccounts] = useState<ForflowModelAccount[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const api = window.api.forflowModelAccounts
  useEffect(() => {
    if (!localHost || !api) {
      return
    }
    let active = true
    setError(false)
    void api
      .list()
      .then((next) => {
        if (active) {
          setAccounts(next)
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
  }, [api, localHost, attempt])
  return (
    <section className="space-y-4">
      <SettingsSubsectionHeader
        title={translate('forflow.modelAccounts.title', '国内模型 API 账户')}
        description={translate(
          'forflow.modelAccounts.description',
          '配置 Kimi、智谱 GLM 与 DeepSeek 的官方 API。网页会员、Kimi Code 和 Coding Plan 的登录及额度另行配置。'
        )}
      />
      {!localHost ? (
        <p className="text-sm text-muted-foreground">
          {translate(
            'forflow.modelAccounts.localOnly',
            '当前选择了远程主机或 WSL。请切回本机以管理本机 API 密钥；此处不会读取或修改远程账户。'
          )}
        </p>
      ) : !api ? (
        <p role="alert" className="text-sm text-muted-foreground">
          {translate(
            'forflow.modelAccounts.unavailable',
            '当前客户端尚不支持此配置，请更新桌面客户端。'
          )}
        </p>
      ) : error ? (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-muted-foreground">
            {translate('forflow.modelAccounts.loadFailed', '账户配置读取失败，请重试。')}
          </p>
          <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
            {translate('forflow.modelAccounts.retry', '重试')}
          </Button>
        </div>
      ) : accounts ? (
        <>
          <p className="text-xs text-muted-foreground">
            {translate(
              'forflow.modelAccounts.scope',
              '密钥仅在本机加密保存。保存不发起请求；测试连接只发送固定测试文本，可能消耗少量 API 额度。此配置暂不自动改写智能体 CLI 的登录与模型配置。'
            )}
          </p>
          <div className="space-y-3">
            {accounts
              .filter((account) => account.provider !== 'jev')
              .map((account) => (
                <ForflowModelAccountCard
                  key={account.provider}
                  account={account}
                  api={api}
                  onChanged={(next) =>
                    setAccounts(
                      (previous) =>
                        previous?.map((item) => (item.provider === next.provider ? next : item)) ??
                        null
                    )
                  }
                />
              ))}
          </div>
          <JevAccountSection />
        </>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {translate('forflow.modelAccounts.loading', '正在读取 API 配置…')}
        </p>
      )}
    </section>
  )
}
