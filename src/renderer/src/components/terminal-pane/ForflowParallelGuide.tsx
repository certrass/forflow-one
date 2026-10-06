import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, GitCompareArrows } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { forflowParallelPrompts } from '../new-workspace/forflow-parallel-prompts'

export function ForflowParallelGuide({
  worktreeId,
  isGit
}: {
  worktreeId: string
  isGit: boolean
}): React.JSX.Element {
  useTranslation()
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const prompts = forflowParallelPrompts()
  const prepare = (intent?: 'alternative' | 'comparison'): void => {
    const state = useAppStore.getState()
    const worktree = state.getKnownWorktreeById(worktreeId)
    setOpen(false)
    state.openModal('new-workspace-composer', {
      telemetrySource: 'unknown',
      ...(worktree ? { initialRepoId: worktree.repoId } : {}),
      ...(intent ? { prefilledPrompt: prompts[intent].prompt, forflowTaskIntent: intent } : {})
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="xs" variant="outline">
          <GitCompareArrows />
          {translate('forflow.parallel.entry', 'Parallel work & comparison')}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 max-w-[calc(100vw-2rem)]"
        aria-labelledby={titleId}
        data-forflow-parallel-guide=""
        data-pane-prevent-terminal-focus=""
      >
        <div className="max-h-[min(36rem,70vh)] space-y-4 overflow-y-auto p-4 scrollbar-sleek">
          <div className="space-y-1">
            <h2 id={titleId} className="text-sm font-semibold">
              {translate('forflow.parallel.title', 'One task, more than one approach')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {translate(
                'forflow.parallel.intro',
                'Let agents work independently, then compare their outputs against the same requirements.'
              )}
            </p>
          </div>
          <ol className="space-y-4">
            <li className="space-y-2">
              <h3 className="text-sm font-medium">
                {translate('forflow.parallel.startTitle', '1. Start a task for each version')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {translate(
                  'forflow.parallel.startBody',
                  'Use the same goal, references and success criteria. Choose an agent for each task, then send the draft in its conversation.'
                )}
              </p>
              <Button size="sm" variant="outline" onClick={() => prepare('alternative')}>
                {prompts.alternative.label}
                <ArrowRight />
              </Button>
            </li>
            <li className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-medium">
                {translate('forflow.parallel.collectTitle', '2. Collect the outputs')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {translate(
                  'forflow.parallel.collectBody',
                  'Open each task from the sidebar. Keep its output file and verification results, labeled by version.'
                )}
              </p>
              <Button
                size="sm"
                variant="link"
                onClick={() => {
                  setOpen(false)
                  useAppStore.getState().showRightSidebarFiles()
                }}
              >
                {translate('forflow.parallel.files', 'View current task files')}
              </Button>
            </li>
            <li className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-medium">
                {translate('forflow.parallel.compareTitle', '3. Compare before choosing')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {translate(
                  'forflow.parallel.compareBody',
                  'Prepare a comparison draft, then attach or paste both outputs in the conversation. Ask for the differences, supporting evidence and a recommendation.'
                )}
              </p>
              <Button size="sm" onClick={() => prepare('comparison')}>
                {translate('forflow.parallel.prepareComparison', 'Prepare comparison draft')}
                <ArrowRight />
              </Button>
            </li>
          </ol>
          <details className="border-t border-border pt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">
              {translate('forflow.parallel.otherTasks', 'Working on different tasks?')}
            </summary>
            <div className="mt-2 space-y-2">
              <p>
                {isGit
                  ? translate(
                      'forflow.parallel.gitHint',
                      'Create a separate workspace for each task. Each has its own branch; Split view shares the current workspace files.'
                    )
                  : translate(
                      'forflow.parallel.folderHint',
                      'Folder tasks share files. Give each task a separate output file or folder, then review the results together.'
                    )}
              </p>
              <Button size="xs" variant="outline" onClick={() => prepare()}>
                {translate('forflow.parallel.blankTask', 'Start a different task')}
              </Button>
            </div>
          </details>
        </div>
      </PopoverContent>
    </Popover>
  )
}
