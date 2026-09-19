import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ForflowIdentityAuditView } from './ForflowIdentityAuditView'
import { translate } from '@/i18n/i18n'
import type {
  ForflowIdentityApi,
  ForflowUser,
  ForflowIdentityStatus
} from '../../../../shared/forflow-identity'

export function ForflowAccountAdministration({
  api,
  onSessionChanged
}: {
  api: ForflowIdentityApi
  onSessionChanged: (status: ForflowIdentityStatus) => void
}): React.JSX.Element {
  const [users, setUsers] = useState<ForflowUser[]>([])
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [resetUser, setResetUser] = useState<ForflowUser | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [audit, setAudit] = useState<Awaited<ReturnType<ForflowIdentityApi['audit']>> | null>(null)

  useEffect(() => {
    let active = true
    void api
      .users()
      .then((value) => {
        if (active) {
          setUsers(value)
        }
      })
      .catch(() => {
        if (active) {
          setMessage(translate('forflow.admin.loadError', '无法读取团队账号。'))
        }
      })
    return () => {
      active = false
    }
  }, [api])

  const run = async (operation: () => Promise<unknown>): Promise<void> => {
    if (busy) {
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await operation()
      const status = await api.status()
      onSessionChanged(status)
      if (status.state === 'connected') {
        setUsers(await api.users())
      }
      setPassword('')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')
          : translate('forflow.admin.error', '账号管理操作失败。')
      )
    } finally {
      setBusy(false)
      setPassword('')
      setResetPassword('')
    }
  }

  return (
    <section className="space-y-4 border-t border-border pt-5">
      <h3 className="text-sm font-semibold">
        {translate('forflow.admin.heading', '团队账号管理')}
      </h3>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void run(async () => {
            await api.createUser({ username, displayName, password, role: 'member' })
            setUsername('')
            setDisplayName('')
          })
        }}
      >
        <Label htmlFor="forflow-new-username">
          {translate('forflow.admin.username', '新成员账号')}
        </Label>
        <Input
          id="forflow-new-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          disabled={busy}
        />
        <Label htmlFor="forflow-new-name">
          {translate('forflow.admin.displayName', '成员姓名')}
        </Label>
        <Input
          id="forflow-new-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          disabled={busy}
        />
        <Label htmlFor="forflow-new-password">
          {translate('forflow.admin.password', '初始密码（至少 12 个字符）')}
        </Label>
        <Input
          id="forflow-new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={12}
          required
          disabled={busy}
        />
        <Button type="submit" disabled={busy}>
          {translate('forflow.admin.create', '创建成员账号')}
        </Button>
      </form>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <div className="divide-y divide-border">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm">
                {user.displayName} · {user.username}
              </p>
              <p className="text-xs text-muted-foreground">
                {user.disabled
                  ? translate('forflow.admin.disabled', '已停用')
                  : user.role === 'admin'
                    ? translate('forflow.admin.administrator', '管理员')
                    : translate('forflow.admin.member', '成员')}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setResetUser(user)
                  setResetPassword('')
                }}
              >
                {translate('forflow.admin.reset', '重置密码')}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(() => api.setUserDisabled({ id: user.id, disabled: !user.disabled }))
                }
              >
                {user.disabled
                  ? translate('forflow.admin.enable', '启用')
                  : translate('forflow.admin.disable', '停用并撤销会话')}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {resetUser ? (
        <form
          className="space-y-3 rounded-md border border-border p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              await api.resetPassword({ id: resetUser.id, password: resetPassword })
              setResetUser(null)
            })
          }}
        >
          <Label htmlFor="forflow-reset-password">
            {translate('forflow.admin.resetFor', '为 {{name}} 设置新密码（至少 12 个字符）', {
              name: resetUser.displayName
            })}
          </Label>
          <Input
            id="forflow-reset-password"
            type="password"
            autoComplete="new-password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
            minLength={12}
            maxLength={256}
            required
            disabled={busy}
          />
          <p className="text-xs text-muted-foreground">
            {translate(
              'forflow.admin.resetHelp',
              '重置后，该账号的所有会话立即失效，需要重新登录。'
            )}
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {translate('forflow.admin.resetConfirm', '保存新密码')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setResetUser(null)
                setResetPassword('')
              }}
            >
              {translate('forflow.admin.cancel', '取消')}
            </Button>
          </div>
        </form>
      ) : null}
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => void run(async () => setAudit(await api.audit()))}
      >
        {translate('forflow.admin.audit', '核验并查看最近审计记录')}
      </Button>
      {audit ? <ForflowIdentityAuditView audit={audit} users={users} /> : null}
    </section>
  )
}
