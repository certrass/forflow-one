import { ClipboardCheck, GitCompareArrows, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { forflowParallelPrompts } from '../new-workspace/forflow-parallel-prompts'

export function ForflowTaskGuide(): React.JSX.Element {
  useTranslation()
  const openModal = useAppStore((state) => state.openModal)
  return (
    <section
      className="mt-3 mb-4 shrink-0 space-y-3 border-b border-border pb-4"
      data-forflow-task-guide=""
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">
            {translate('forflow.focus.taskTitle', 'From task to result')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {translate(
              'forflow.focus.taskDescription',
              'Describe a task, try different approaches, then review what is ready to use.'
            )}
          </p>
        </div>
        <Button size="sm" onClick={() => openModal('new-workspace-composer', {})}>
          <Plus />
          {translate('forflow.focus.newTask', 'New task')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <div className="space-y-1">
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
          <p className="text-xs text-muted-foreground">
            {translate(
              'forflow.focus.parallelDescription',
              'Give agents the same goal, then compare their outputs.'
            )}
          </p>
        </div>
        <div className="space-y-1">
          <Button size="sm" variant="outline" onClick={() => openModal('forflow-review')}>
            <ClipboardCheck />
            {translate('forflow.focus.review', 'Review results')}
          </Button>
          <p className="text-xs text-muted-foreground">
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
