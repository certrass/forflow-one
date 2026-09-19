import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translate } from '@/i18n/i18n'
import type { ForflowIdentityStatus } from '../../../../shared/forflow-identity'
import { ForflowAccountAdministration } from './ForflowAccountAdministration'

export function ForflowAccountSettingsPane(): React.JSX.Element {
  const [status, setStatus] = useState<ForflowIdentityStatus | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const api = window.api.forflowIdentity

  useEffect(() => {
    let active = true
    void api
      ?.status()
      .then((value) => {
        if (active) {
          setStatus(value)
          setServerUrl(value.serverUrl ?? '')
          setError(value.error ?? '')
        }
      })
      .catch(() => {
        if (active) {
          setError(translate('forflow.identity.statusError', '无法读取账号状态。'))
        }
      })
    return () => {
      active = false
    }
  }, [api])

  const run = async (operation: () => Promise<ForflowIdentityStatus>): Promise<void> => {
    if (busy) {
      return
    }
    setBusy(true)
    setError('')
    try {
      const value = await operation()
      setStatus(value)
      setServerUrl(value.serverUrl ?? '')
      setError(value.error ?? '')
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message.replace(/^Error invoking remote method '[^']+': Error: /, '')
          : translate('forflow.identity.requestError', '操作失败，请重试。')
      )
    } finally {
      setBusy(false)
      setPassword('')
    }
  }

  return (
    <div className="space-y-6" data-testid="forflow-account">
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {translate('forflow.identity.heading', 'Forflow 企业账号')}
        </p>
        <p className="text-sm text-muted-foreground">
          {translate(
            'forflow.identity.boundary',
            '账号、会话和登录记录保存在部署方的身份服务中。项目文件不会随登录上传。'
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {translate(
            'forflow.identity.noUpstream',
            '当前版本已关闭 Orca 云账号、云分享和中继服务。模型及代码托管服务按各自配置连接。'
          )}
        </p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (api) {
            void run(() => api.configure(serverUrl || null))
          }
        }}
      >
        <Label htmlFor="forflow-server">
          {translate('forflow.identity.server', '身份服务地址')}
        </Label>
        <Input
          id="forflow-server"
          value={serverUrl}
          onChange={(event) => setServerUrl(event.target.value)}
          placeholder="https://identity.example.cn"
          autoComplete="url"
          disabled={busy}
        />
        <p className="text-xs text-muted-foreground">
          {translate(
            'forflow.identity.serverHelp',
            '请填写管理员提供的 HTTPS 地址。本机调试可使用 http://127.0.0.1:43120。更换服务会退出当前账号。'
          )}
        </p>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={busy || !api}>
            {translate('forflow.identity.configure', '保存并检测')}
          </Button>
          {status?.serverUrl ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (api) {
                  void run(() => api.configure(null))
                }
              }}
            >
              {translate('forflow.identity.localMode', '切换为本机使用')}
            </Button>
          ) : null}
        </div>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {status?.state === 'local' ? (
        <p role="status" className="text-sm text-muted-foreground">
          {translate(
            'forflow.identity.localDescription',
            '本机模式：无需平台账号即可管理本地项目。连接企业服务后可登录并管理团队账号。'
          )}
        </p>
      ) : null}
      {status?.serverUrl ? (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (api) {
              void run(() => api.status())
            }
          }}
        >
          {translate('forflow.identity.refresh', '刷新登录状态')}
        </Button>
      ) : null}
      {status?.session ? (
        <div className="space-y-3 border-t border-border pt-5">
          <p className="text-sm font-medium">
            {status.session.user.displayName} · {status.session.user.username}
          </p>
          <p className="text-xs text-muted-foreground">
            {status.persistence === 'encrypted'
              ? translate('forflow.identity.encrypted', '会话已由系统密钥存储加密保存。')
              : translate(
                  'forflow.identity.memoryOnly',
                  '会话仅在本次运行期间保存，重启后需重新登录。'
                )}
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (api) {
                void run(() => api.logout())
              }
            }}
          >
            {translate('forflow.identity.signOut', '退出登录')}
          </Button>
          {status.session.user.role === 'admin' && api ? (
            <ForflowAccountAdministration
              api={api}
              onSessionChanged={(value) => {
                setStatus(value)
                setError(value.error ?? '')
              }}
            />
          ) : null}
        </div>
      ) : status?.serverUrl ? (
        <form
          className="space-y-3 border-t border-border pt-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (api) {
              void run(() => api.login({ username, password }))
            }
          }}
        >
          <Label htmlFor="forflow-username">{translate('forflow.identity.username', '账号')}</Label>
          <Input
            id="forflow-username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={busy}
            required
          />
          <Label htmlFor="forflow-password">{translate('forflow.identity.password', '密码')}</Label>
          <Input
            id="forflow-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
            required
          />
          <Button type="submit" disabled={busy || !username || !password}>
            {busy
              ? translate('forflow.identity.processing', '处理中…')
              : translate('forflow.identity.signIn', '登录 Forflow')}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
