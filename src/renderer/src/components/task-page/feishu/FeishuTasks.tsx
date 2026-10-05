import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import { useAppStore } from '@/store'
import { ForflowFeishuConnection } from '@/components/settings/ForflowFeishuConnection'
import { buildFeishuTaskPrompt } from '../../../../../shared/forflow-feishu'
import { useFeishuTasks } from './use-feishu-tasks'

export function FeishuTasks(): React.JSX.Element {
  const model = useFeishuTasks()
  const openModal = useAppStore((s) => s.openModal)
  const [search, setSearch] = useState('')
  const detailRef = useRef<HTMLElement>(null)
  useEffect(() => {
    detailRef.current?.scrollIntoView({ block: 'nearest' })
  }, [model.selected])
  const tasks =
    model.tasks?.items.filter((task) =>
      `${task.title}\n${task.description}`.toLowerCase().includes(search.toLowerCase())
    ) ?? []
  return (
    <div
      className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-sleek pb-4"
      data-testid="feishu-tasks"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">把飞书任务带到工作区</h2>
        <p className="text-sm text-muted-foreground">
          连接个人账号 → 读取任务或清单 →
          查看详情并准备对话。任务资料会复制到新会话草稿，发送后才开始执行。
        </p>
      </div>
      <ForflowFeishuConnection onChange={model.setStatus} />
      {model.connected ? (
        <>
          <div
            className="flex flex-wrap items-center gap-2"
            data-contextual-tour-target="tasks-search-presets"
          >
            <Select
              value={model.tasklistId}
              onValueChange={model.setTasklistId}
              disabled={model.busy}
            >
              <SelectTrigger aria-label="飞书任务清单">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mine">我的任务</SelectItem>
                {model.tasklists?.items.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={model.busy}
              onClick={() => void model.loadLists()}
            >
              读取任务清单
            </Button>
            {model.tasklists?.nextPageToken ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={model.busy}
                onClick={() => void model.loadLists(true)}
              >
                更多清单
              </Button>
            ) : null}
            <Select
              value={model.completed ? 'done' : 'todo'}
              onValueChange={(value) => model.setCompleted(value === 'done')}
              disabled={model.busy}
            >
              <SelectTrigger aria-label="飞书任务状态">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">未完成</SelectItem>
                <SelectItem value="done">已完成</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={model.busy}
              onClick={() => void model.load()}
              data-contextual-tour-target="tasks-actions"
            >
              {model.busy ? '读取中…' : '读取任务'}
            </Button>
          </div>
          {model.error ? (
            <p role="alert" className="text-sm text-destructive">
              {model.error}
            </p>
          ) : null}
          {!model.tasks ? (
            <p className="text-sm text-muted-foreground">
              选择“我的任务”或先读取任务清单，再点击“读取任务”。仅获取当前账号获准访问的内容。
            </p>
          ) : (
            <>
              <label className="block space-y-1 text-sm">
                搜索已读取的任务
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="按标题或说明筛选当前已加载结果"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                已读取 {model.tasks.items.length} 项 ·{' '}
                {new Date(model.tasks.fetchedAt).toLocaleString()} ·{' '}
                {model.tasks.nextPageToken ? '还有更多任务可加载' : '当前范围已读取完毕'}
              </p>
              <div className="divide-y divide-border rounded-md border border-border">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{task.title}</p>
                      <p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                        {task.description || '暂无任务说明'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={model.busy}
                      onClick={() => void model.select(task.id)}
                    >
                      查看任务
                    </Button>
                  </div>
                ))}
                {tasks.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    {search
                      ? '当前已加载结果中没有匹配项。清除搜索或加载更多任务。'
                      : '此范围暂无任务。可切换清单或完成状态后重新读取。'}
                  </p>
                ) : null}
              </div>
              {model.tasks.nextPageToken ? (
                <Button
                  variant="outline"
                  disabled={model.busy}
                  onClick={() => void model.load(true)}
                >
                  加载更多任务
                </Button>
              ) : null}
            </>
          )}
          {model.selected ? (
            <section
              ref={detailRef}
              className="space-y-3 rounded-md border border-border bg-card p-4"
              aria-label="飞书任务详情"
            >
              <h3 className="text-base font-semibold">{model.selected.task.title}</h3>
              <p className="whitespace-pre-wrap break-words text-sm">
                {model.selected.task.description || '暂无任务说明，可在下一步补充目标。'}
              </p>
              <p className="break-all text-xs text-muted-foreground">
                任务 ID：{model.selected.task.id} ·{' '}
                {model.selected.task.completed ? '已完成' : '未完成'} · 读取时间：
                {new Date(model.selected.fetchedAt).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                带入内容：标题、说明、来源链接和读取时间。下一步选择项目与智能体，并可修改任务说明。附件、评论及飞书状态不会自动同步。
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={model.busy}
                  data-contextual-tour-target="tasks-start-workspace"
                  onClick={() => {
                    if (!model.selected) {
                      return
                    }
                    openModal('new-workspace-composer', {
                      prefilledName: model.selected.task.title,
                      prefilledPrompt: buildFeishuTaskPrompt(
                        model.selected.task,
                        model.selected.fetchedAt
                      ),
                      telemetrySource: 'unknown'
                    })
                  }}
                >
                  选择项目并准备对话
                </Button>
                {model.selected.task.url ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (model.selected?.task.url) {
                        void window.api.shell.openUrl(model.selected.task.url)
                      }
                    }}
                  >
                    在飞书中打开
                  </Button>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
