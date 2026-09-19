import { useCallback, useEffect, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/store'
import {
  getSettingsFocusedExecutionHostId,
  LOCAL_EXECUTION_HOST_ID
} from '../../../../shared/execution-host'
import type { FeishuStatus } from '../../../../shared/forflow-feishu'
import { IntegrationCardShell, IntegrationCardDetails } from './integration-card-shell'

export const FEISHU_SETUP_COMMANDS = [
  { title: '1. 安装官方 CLI（已有可跳过）', command: 'npm install -g @larksuite/cli' },
  { title: '2. 配置飞书应用（已有可跳过）', command: 'lark-cli config init --new' },
  {
    title: '3. 授予任务读取权限',
    command: 'lark-cli auth login --scope "task:task:read task:tasklist:read offline_access"'
  }
]

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
  const [profile, setProfile] = useState('')
  const update = useCallback(
    (value: FeishuStatus | null) => {
      setStatus(value)
      onChange?.(value)
    },
    [onChange]
  )
  useEffect(() => {
    let current = true
    update(null)
    if (available) {
      void window.api.forflowFeishu
        ?.status()
        .then((value) => {
          if (current) {
            update(value)
          }
        })
        .catch(() => {
          if (current) {
            setError('无法读取飞书连接状态，请重试。')
          }
        })
    }
    return () => {
      current = false
    }
  }, [available, update])

  const act = async (disconnect: boolean): Promise<void> => {
    const api = window.api.forflowFeishu
    if (!available || !api || busy) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (disconnect) {
        await api.disconnect()
        update({ installed: true, connection: null })
      } else {
        update(await api.connect(profile.trim() || status?.connection?.appId || undefined))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '飞书连接失败，请重试。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <IntegrationCardShell
      icon={<ListChecks className="size-5" />}
      name="飞书任务"
      description="通过本机官方飞书 CLI 的个人授权，读取任务和任务清单。"
      settingsSectionId="forflow-feishu"
      statusTone={status?.connection ? 'connected' : 'neutral'}
      statusLabel={status?.connection ? `已绑定 · ${status.connection.userName}` : '未连接'}
      actions={
        <>
          {status?.connection && onBrowse ? (
            <Button size="sm" onClick={onBrowse}>
              浏览任务
            </Button>
          ) : null}
          <Button
            size="sm"
            variant={status?.connection ? 'outline' : 'default'}
            disabled={!available || busy}
            onClick={() => void act(false)}
          >
            {busy ? '处理中…' : status?.connection ? '重新检测授权' : '连接本机飞书'}
          </Button>
          {status?.connection ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={!available || busy}
              onClick={() => void act(true)}
            >
              断开连接
            </Button>
          ) : null}
        </>
      }
    >
      <IntegrationCardDetails>
        {!available ? (
          <p role="status" className="text-sm text-muted-foreground">
            飞书连接由本机桌面管理，请切回本机运行环境后连接和读取。SSH、远程服务器及网页版暂不读取本机授权。
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {status?.connection ? (
          <p className="text-xs text-muted-foreground">
            应用：{status.connection.appId}。断开仅移除 Forflow
            绑定；不会退出其他工具的飞书登录。实际任务权限将在读取时验证。
          </p>
        ) : null}
        <details open={!status?.connection}>
          <summary className="cursor-pointer text-sm font-medium">首次连接与授权指引</summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              在系统终端依次执行，按提示到飞书完成应用配置和个人授权，再点击上方“连接本机飞书”。企业管理员可能需要批准应用权限。密钥由官方
              CLI 管理，无需粘贴到 Forflow。
            </p>
            {FEISHU_SETUP_COMMANDS.map((step) => (
              <div key={step.command} className="space-y-1">
                <p className="text-sm">{step.title}</p>
                <div className="flex items-start gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-md bg-muted p-2 text-xs">
                    {step.command}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(step.command)
                        .catch(() => setError('复制失败，请手动选择命令复制。'))
                    }}
                  >
                    复制
                  </Button>
                </div>
              </div>
            ))}
            <label className="block space-y-1 text-sm">
              应用 ID（可选，多账号时指定）
              <Input
                value={profile}
                onChange={(event) => setProfile(event.target.value)}
                placeholder="cli_…，留空使用 CLI 默认应用"
                autoComplete="off"
              />
            </label>
            <Button
              variant="link"
              size="sm"
              onClick={() => void window.api.shell.openUrl('https://github.com/larksuite/cli')}
            >
              官方安装与授权文档
            </Button>
          </div>
        </details>
      </IntegrationCardDetails>
    </IntegrationCardShell>
  )
}
