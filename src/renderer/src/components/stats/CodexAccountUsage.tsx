import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../store'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { formatUpdatedAt } from './usage-formatters'

const PLAN_NAMES: Record<string, string> = {
  pro: 'Pro',
  plus: 'Plus',
  free: '免费',
  team: 'Team',
  business: 'Business',
  enterprise: 'Enterprise',
  edu: 'Edu'
}

export function CodexAccountUsage() {
  const limits = useAppStore((s) => s.rateLimits?.codex)
  const target = useAppStore((s) => s.rateLimits?.codexTarget)
  const fetchLimits = useAppStore((s) => s.fetchRateLimits)
  const refresh = useAppStore((s) => s.refreshCodexRateLimitsForTarget)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void fetchLimits?.()
  }, [fetchLimits])
  const plan = limits?.planType
  const credits = limits?.credits
  const windows = [
    { label: '5 小时额度', value: limits?.session },
    { label: '每周额度', value: limits?.weekly }
  ]
  return (
    <section aria-label="Codex 套餐与额度" className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          Codex 套餐与额度 <Badge variant="secondary">Beta</Badge>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || !target || !refresh}
          onClick={async () => {
            if (!target || !refresh) {
              return
            }
            setPending(true)
            setError(null)
            try {
              await refresh(target)
            } catch {
              setError('账户用量刷新失败，请重试。')
            } finally {
              setPending(false)
            }
          }}
        >
          <RefreshCw className="size-3.5" />
          {pending ? '正在刷新' : '刷新账户用量'}
        </Button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">当前套餐</dt>
          <dd className="mt-1 text-sm font-medium">
            {plan ? (PLAN_NAMES[plan] ?? plan) : '未返回套餐'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">剩余额度点数</dt>
          <dd className="mt-1 text-sm font-medium">
            {credits?.unlimited ? '不限额' : (credits?.balance ?? '未返回余额')}
          </dd>
        </div>
        {windows.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-medium">
              {value ? `已用 ${Math.round(value.usedPercent)}%` : '未返回窗口'}
            </dd>
            {value?.resetsAt && (
              <dd className="mt-1 text-xs text-muted-foreground">
                {new Date(value.resetsAt).toLocaleString('zh-CN')} 重置
              </dd>
            )}
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        账户范围 · {target?.runtime === 'wsl' ? `WSL ${target.wslDistro ?? ''}` : '本机登录'} ·{' '}
        {formatUpdatedAt(limits?.updatedAt || null)}。套餐与额度不受下方日志的项目和时间筛选影响。
      </p>
      {(error || limits?.error) && (
        <p role="alert" className="text-xs text-destructive">
          {error ?? limits?.error}；已有值为上次快照。
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          额度点数不是货币。已支付金额以官方账单为准；项目分摊还需账期金额和分摊规则。
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void window.api.shell
              .openUrl('https://chatgpt.com/codex/settings/usage')
              .catch(() => setError('无法打开官方用量与账单页面。'))
          }}
        >
          官方用量与账单 <ExternalLink className="size-3.5" />
        </Button>
      </div>
    </section>
  )
}
