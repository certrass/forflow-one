import { useCallback, useEffect, useRef, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAppStore } from '@/store'
import {
  getSettingsFocusedExecutionHostId,
  LOCAL_EXECUTION_HOST_ID
} from '../../../../shared/execution-host'
import { feishuProfileSchema, type FeishuStatus } from '../../../../shared/forflow-feishu'
import { IntegrationCardShell, IntegrationCardDetails } from './integration-card-shell'
import { ForflowFeishuSetup } from './ForflowFeishuSetup'
import { readIpcErrorMessage } from '@/lib/ipc-error'

export function ForflowFeishuConnection({
  onChange,
  onBrowse
}: {
  onChange?: (status: FeishuStatus | null) => void
  onBrowse?: () => void
}): React.JSX.Element {
  const host = useAppStore((s) => getSettingsFocusedExecutionHostId(s.settings))
  const available = host === LOCAL_EXECUTION_HOST_ID && Boolean(window.api.forflowFeishu)
  const [status, setStatus] = useState<FeishuStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(available)
  const [setupOpen, setSetupOpen] = useState(false)
  const [profile, setProfile] = useState('')
  const generation = useRef(0)
  const appId = profile.trim() || status?.connection?.appId || ''
  const update = useCallback(
    (value: FeishuStatus | null) => {
      setStatus(value)
      onChange?.(value)
    },
    [onChange]
  )
  useEffect(() => {
    const request = ++generation.current
    update(null)
    setError(null)
    setBusy(false)
    setChecking(available)
    setSetupOpen(false)
    if (available) {
      void window.api.forflowFeishu
        ?.status()
        .then((value) => {
          if (request === generation.current) {
            update(value)
          }
        })
        .catch(() => {
          if (request === generation.current) {
            setError('暂时无法检查连接，请重试。')
          }
        })
        .finally(() => {
          if (request === generation.current) {
            setChecking(false)
          }
        })
    }
    return () => {
      generation.current = request + 1
    }
  }, [available, update])

  const act = async (disconnect: boolean): Promise<void> => {
    const api = window.api.forflowFeishu
    if (!available || !api || busy || checking) {
      return
    }
    const request = generation.current
    setBusy(true)
    setError(null)
    try {
      if (disconnect) {
        await api.disconnect()
        if (request === generation.current) {
          update({ installed: status?.installed ?? true, connection: null })
        }
      } else {
        if (appId && !feishuProfileSchema.safeParse(appId).success) {
          setError('应用 ID 应以 cli_ 开头，只包含字母和数字。')
          return
        }
        const result = await api.connect(appId || undefined)
        if (request === generation.current) {
          update(result)
          setSetupOpen(false)
        }
      }
    } catch (cause) {
      if (request === generation.current) {
        setError(readIpcErrorMessage(cause) ?? '连接未完成，请重试。')
      }
    } finally {
      if (request === generation.current) {
        setBusy(false)
      }
    }
  }

  const connected = Boolean(status?.connection)
  return (
    <IntegrationCardShell
      icon={<ListChecks className="size-5" />}
      name="飞书任务"
      description="查看飞书任务和清单，选择一项交给智能体处理。"
      settingsSectionId="forflow-feishu"
      statusTone={connected ? 'connected' : 'neutral'}
      statusLabel={
        !available ? '请切回本机' : checking ? '正在检查…' : connected ? '已连接' : '未连接'
      }
      actions={
        available && (!connected || onBrowse) ? (
          connected && onBrowse ? (
            <Button size="sm" onClick={onBrowse}>
              查看任务
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={busy || checking}
              onClick={() => {
                if (!setupOpen && status && !status.installed) {
                  setSetupOpen(true)
                } else {
                  void act(false)
                }
              }}
            >
              {busy ? '正在连接…' : '连接飞书'}
            </Button>
          )
        ) : undefined
      }
    >
      <IntegrationCardDetails>
        {!available ? (
          <p className="text-sm text-muted-foreground">切回本机后，即可连接飞书并查看任务。</p>
        ) : (
          <>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {connected ? (
              <>
                <p className="text-sm">{status?.connection?.userName}</p>
                <details>
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    管理连接
                  </summary>
                  <div className="mt-3 space-y-3">
                    <p className="break-all text-xs text-muted-foreground">
                      应用 ID：{status?.connection?.appId}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void act(false)}
                      >
                        {busy ? '正在更新…' : '刷新连接'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void act(true)}
                      >
                        断开连接
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      断开后，飞书中的登录和任务仍会保留。
                    </p>
                  </div>
                </details>
              </>
            ) : (
              <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    已有飞书授权？点击“连接飞书”即可继续。
                  </p>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {setupOpen ? '收起步骤' : '首次连接'}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="pt-4">
                    <ForflowFeishuSetup
                      profile={profile}
                      onProfileChange={setProfile}
                      installed={status?.installed ?? false}
                      busy={busy}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </IntegrationCardDetails>
    </IntegrationCardShell>
  )
}
