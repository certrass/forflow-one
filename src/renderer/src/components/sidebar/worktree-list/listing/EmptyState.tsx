import React from 'react'
import { useTranslation } from 'react-i18next'
import { CircleX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'

export function SidebarWorktreeListEmptyState({
  hasFilters,
  onClearFilters
}: {
  hasFilters: boolean
  onClearFilters: () => void
}): React.JSX.Element {
  // The memoized sidebar can mount before the lazy Chinese catalog resolves.
  // Subscribe here so the first-launch empty state follows the selected language.
  useTranslation()
  return (
    <div
      data-worktree-sidebar-container
      data-contextual-tour-target="workspace-list"
      className="relative min-h-0 flex-1"
    >
      <div className="worktree-sidebar-scrollbar flex h-full flex-col overflow-y-auto overflow-x-hidden pl-1 scrollbar-sleek pt-px">
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-[11px] text-muted-foreground">
          <span>
            {translate('auto.components.sidebar.WorktreeList.b7acbf038b', 'No workspaces found')}
          </span>
          {hasFilters && (
            <Button
              variant="secondary"
              size="xs"
              onClick={onClearFilters}
              className="gap-1.5 border border-border/80 text-[11px]"
            >
              <CircleX className="size-3.5" />
              {translate('auto.components.sidebar.WorktreeList.370c6a55dd', 'Clear Filters')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
