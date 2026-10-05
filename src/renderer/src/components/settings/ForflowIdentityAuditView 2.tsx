import { z } from 'zod'
import { translate } from '@/i18n/i18n'
import type { ForflowIdentityApi, ForflowUser } from '../../../../shared/forflow-identity'

const eventSchema = z.object({
  at: z.string(),
  action: z.string(),
  actor: z.string(),
  subject: z.string(),
  outcome: z.string()
})

function actionLabel(action: string): string {
  switch (action) {
    case 'user.create':
      return translate('forflow.audit.create', '创建账号')
    case 'user.disable':
      return translate('forflow.audit.disable', '停用账号')
    case 'user.enable':
      return translate('forflow.audit.enable', '启用账号')
    case 'user.password-reset':
      return translate('forflow.audit.password', '重置密码')
    case 'session.login':
      return translate('forflow.audit.login', '登录')
    case 'session.logout':
      return translate('forflow.audit.logout', '退出登录')
    case 'request.denied':
      return translate('forflow.audit.denied', '访问被拒绝')
    default:
      return action
  }
}

export function ForflowIdentityAuditView({
  audit,
  users
}: {
  audit: Awaited<ReturnType<ForflowIdentityApi['audit']>>
  users: ForflowUser[]
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {translate('forflow.admin.auditCount', '已核验 {{count}} 条记录；下方显示最近 100 条。', {
          count: audit.verification.events
        })}
      </p>
      <ol className="max-h-64 divide-y divide-border overflow-auto scrollbar-sleek rounded-md border border-border p-3">
        {audit.events.map((record) => {
          let event: z.infer<typeof eventSchema>
          try {
            event = eventSchema.parse(JSON.parse(record.body))
          } catch {
            return null
          }
          const actor =
            users.find((user) => user.id === event.actor)?.displayName ??
            translate('forflow.audit.system', '本机管理员或未登录用户')
          const subject = users.find((user) => user.id === event.subject)?.displayName
          return (
            <li key={record.sequence} className="space-y-1 py-2 text-xs">
              <p>
                {actionLabel(event.action)} ·{' '}
                {event.outcome === 'success'
                  ? translate('forflow.audit.success', '成功')
                  : translate('forflow.audit.rejected', '拒绝')}{' '}
                · {subject ?? actor}
              </p>
              <p className="text-muted-foreground">
                {new Date(event.at).toLocaleString('zh-CN')} · {actor}
              </p>
            </li>
          )
        })}
      </ol>
      <details className="text-xs text-muted-foreground">
        <summary>{translate('forflow.audit.details', '查看核验摘要和原始记录')}</summary>
        <pre className="max-h-64 overflow-auto scrollbar-sleek whitespace-pre-wrap break-all p-2">
          {JSON.stringify(audit, null, 2)}
        </pre>
      </details>
    </div>
  )
}
