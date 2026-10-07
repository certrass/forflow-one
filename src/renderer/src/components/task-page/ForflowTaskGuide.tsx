import { ClipboardCheck, GitCompareArrows, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { forflowParallelPrompts } from '../new-workspace/forflow-parallel-prompts'

export function ForflowTaskGuide({ onClose }: { onClose: () => void }): React.JSX.Element {
  useTranslation()
  const openModal = useAppStore((state) => state.openModal)
  return (
    <section className="shrink-0 space-y-5 border-b border-border py-5" data-forflow-task-guide="">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">
            {translate('forflow.focus.taskTitle', 'From task to result')}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {translate(
              'forflow.focus.taskDescription',
              'Describe a task, try different approaches, then review what is ready to use.'
            )}
          </p>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={translate('auto.components.TaskPage.1a06219d5c', 'Close tasks')}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Button size="sm" onClick={() => openModal('new-workspace-composer', {})}>
            <Plus />
            {translate('forflow.focus.newTask', 'New task')}
          </Button>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {translate('forflow.focus.newTaskHint', 'Choose an agent and describe what you need.')}
          </p>
        </div>
        <div className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              openModal('new-workspace-composer', {
                forflowTaskIntent: 'alternative',
                prefilledPrompt: forflowParallelPrompts().alternative.prompt
              })
            }
          >
            <GitCompareArrows />
            {translate('forflow.focus.parallel', 'Explore approaches in parallel')}
          </Button>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {translate(
              'forflow.focus.parallelDescription',
              'Give agents the same goal, then compare their outputs.'
            )}
          </p>
        </div>
        <div className="space-y-2">
          <Button size="sm" variant="outline" onClick={() => openModal('forflow-review')}>
            <ClipboardCheck />
            {translate('forflow.focus.review', 'Review results')}
          </Button>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {translate(
              'forflow.focus.reviewHint',
              'Select materials and check them against your requirements.'
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
