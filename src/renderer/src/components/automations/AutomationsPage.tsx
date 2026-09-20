import { AutomationsPageSurface } from './AutomationsPageSurface'
import { useAutomationsPageController } from './use-automations-page-controller'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodexAutomationsPanel } from './CodexAutomationsPanel'

export default function AutomationsPage(): React.JSX.Element {
  const controller = useAutomationsPageController()
  return (
    <Tabs defaultValue="forflow" className="flex h-full min-h-0 flex-col">
      <TabsList className="mx-5 mt-3 self-start" aria-label="自动化来源">
        <TabsTrigger value="forflow">自动化管理</TabsTrigger>
        <TabsTrigger value="codex">Codex 任务（本机，只读）</TabsTrigger>
      </TabsList>
      <TabsContent value="forflow" className="min-h-0 flex-1">
        <AutomationsPageSurface controller={controller} />
      </TabsContent>
      <TabsContent value="codex" className="flex min-h-0 flex-1 flex-col">
        <CodexAutomationsPanel />
      </TabsContent>
    </Tabs>
  )
}
