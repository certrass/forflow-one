import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { CodexAutomationList } from '../../../../shared/codex-automations'
import {
  CODEX_AUTOMATION_ISSUES,
  codexAutomationSchedule,
  codexAutomationStatus
} from './codex-automation-display'

export function CodexAutomationsPanel(): React.JSX.Element {
  const [result, setResult] = useState<CodexAutomationList | null>(null)
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  useEffect(() => {
    let current = true
    setBusy(true)
    setError(null)
    setResult(null)
    const read = window.api.automations?.listLocalCodex
    if (!read) {
      setError('当前连接不支持读取本机 Codex 自动化，请在 Forflow One 桌面端查看。')
      setBusy(false)
      return
    }
    void read()
      .then((value) => {
        if (current) {
          setResult(value)
        }
      })
      .catch(() => {
        if (current) {
          setError('读取 Codex 自动化失败，请重试或重启 Forflow One。')
        }
      })
      .finally(() => {
        if (current) {
          setBusy(false)
        }
      })
    return () => {
      current = false
    }
  }, [reload])
  const query = search.trim().toLocaleLowerCase()
  const tasks = (result?.automations ?? []).filter((task) =>
    [task.name, task.id, ...task.cwds].some((value) => value.toLocaleLowerCase().includes(query))
  )
  return (
    <section
      aria-label="Codex 本机自动化"
      aria-busy={busy}
      className="scrollbar-sleek min-h-0 flex-1 space-y-4 overflow-auto p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold">
          Codex 自动化{result ? ` · ${result.automations.length}` : ''}
        </h1>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => setReload((v) => v + 1)}>
          <RefreshCw className="size-4" />
          刷新
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        读取这台电脑上的 Codex 任务配置。由 Codex 负责执行，请在 Codex 中修改、暂停或查看运行结果。
        此处为只读视图，启用状态不代表正在运行。
      </p>
      {result && (
        <p className="break-all text-xs text-muted-foreground">
          读取目录：{result.sourceDirectory} · {new Date(result.readAt).toLocaleTimeString()} 更新
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          正在读取 Codex 任务…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && result.issues.length > 0 && (
        <div role="alert" className="space-y-2 rounded-md border border-border p-3 text-sm">
          <p>部分配置未能读取，已读到的任务仍可查看。</p>
          {result.issues.map((issue) => (
            <p key={`${issue.path}:${issue.code}`} className="break-all text-muted-foreground">
              {issue.path}：{CODEX_AUTOMATION_ISSUES[issue.code]}
            </p>
          ))}
        </div>
      )}
      {result && !busy && result.automations.length === 0 && result.status !== 'error' && (
        <p className="text-sm text-muted-foreground">
          未在此目录读到 Codex 自动化。请确认 Codex 已在这台电脑创建任务；自定义目录使用启动 Forflow
          One 时的 CODEX_HOME。
        </p>
      )}
      {(result?.automations.length ?? 0) > 0 && (
        <Input
          aria-label="搜索 Codex 自动化"
          placeholder="搜索名称或项目路径"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}
      {query && result && result.automations.length > 0 && tasks.length === 0 && (
        <p className="text-sm text-muted-foreground">没有匹配的任务。</p>
      )}
      <ul className="divide-y divide-border">
        {tasks.map((task) => (
          <li key={task.id} className="space-y-2 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 break-words text-sm font-medium">{task.name}</h2>
              <Badge variant="secondary">{codexAutomationStatus(task.status)}</Badge>
              <span className="text-xs text-muted-foreground">
                {task.kind === 'heartbeat'
                  ? '会话跟进'
                  : task.kind === 'cron'
                    ? '定时任务'
                    : `其他类型：${task.kind}`}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{codexAutomationSchedule(task.rrule)}</p>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">任务详情</summary>
              <div className="mt-3 space-y-3">
                <p className="whitespace-pre-wrap break-words">{task.prompt}</p>
                <p className="break-all text-xs text-muted-foreground">
                  计划原文：{task.rrule}（时间与实际触发以 Codex 为准）
                </p>
                {task.model && <p className="text-xs text-muted-foreground">模型：{task.model}</p>}
                {task.cwds.map((cwd) => (
                  <p key={cwd} className="break-all text-xs text-muted-foreground">
                    项目：{cwd}
                  </p>
                ))}
                {task.targetThreadId && (
                  <p className="break-all text-xs text-muted-foreground">
                    关联会话：{task.targetThreadId}
                  </p>
                )}
                <p className="break-all text-xs text-muted-foreground">
                  配置文件：{task.sourcePath}
                </p>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  )
}
