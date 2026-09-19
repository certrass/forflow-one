import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store'

export function ForflowTaskGuide(): React.JSX.Element {
  const openSettingsPage = useAppStore((s) => s.openSettingsPage)
  const openSettingsTarget = useAppStore((s) => s.openSettingsTarget)
  const openModal = useAppStore((s) => s.openModal)
  return (
    <details className="mt-3 rounded-md border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">从任务到结果：使用指引</summary>
      <div className="mt-3 space-y-3 text-sm">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            选择来源：可连接飞书任务、Jira、Linear，或使用 GitHub／GitLab
            议题。先读任务详情，确认范围。
          </li>
          <li>
            准备工作区：选择项目或普通文件夹，写清目标、资料、交付物和约束，再选择 Codex。Git
            项目可用独立工作树并行处理不同任务。
          </li>
          <li>
            发送并检查：在对话草稿中核对资料后发送。文件可拖入输入区作为引用；“查看更改”展示 Git
            改动，“文件”查看输出，“浏览器”预览页面。
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">
          “分屏”在当前工作区打开另一个窗格；隔离并行改动请创建新工作树。外部任务导入为资料副本，结果不会自动回写到来源系统。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => openModal('new-workspace-composer', {})}>
            创建一个任务
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              openSettingsPage()
              openSettingsTarget({
                pane: 'integrations',
                repoId: null,
                sectionId: 'forflow-feishu'
              })
            }}
          >
            连接任务来源
          </Button>
        </div>
      </div>
    </details>
  )
}
