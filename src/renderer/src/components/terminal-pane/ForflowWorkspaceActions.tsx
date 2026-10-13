import { isForflowBuild } from '../../../../shared/product-branding'
import { ClipboardCheck, FileDiff, FolderOpen, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { parseWorkspaceKey } from '../../../../shared/workspace-scope'
import { isFolderRepo } from '../../../../shared/repo-kind'
import { getResolvedExecutionHostIdForWorktree } from '@/lib/resolved-worktree-execution-host'
import { ForflowAgentActions } from './ForflowAgentActions'
import { ForflowSessionGuide } from './ForflowSessionGuide'

function useWorkspaceHasGitChanges(worktreeId: string | undefined): boolean {
  return useAppStore((state) => {
    if (!isForflowBuild() || !worktreeId || parseWorkspaceKey(worktreeId)?.type === 'folder') {
      return false
    }
    const worktree = state.getKnownWorktreeById(worktreeId)
    const repo = state.repos.find((item) => item.id === worktree?.repoId)
    return Boolean(repo && !isFolderRepo(repo))
  })
}

export function ForflowWorkspaceActions({
  worktreeId,
  canReview
}: {
  worktreeId: string
  canReview: boolean
}): React.JSX.Element {
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const state = useAppStore.getState()
          const scope = parseWorkspaceKey(worktreeId)
          const hostId = getResolvedExecutionHostIdForWorktree(state, worktreeId)
          state.openModal('forflow-review', {
            initialReviewTarget: hostId
              ? {
                  hostId,
                  selector:
                    scope?.type === 'folder'
                      ? `folder:${scope.folderWorkspaceId}`
                      : `id:${worktreeId}`
                }
              : undefined
          })
        }}
      >
        <ClipboardCheck />
        {translate('forflow.focus.review', 'Review results')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <FolderOpen />
            {translate('forflow.focus.outputs', 'View outputs')}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => useAppStore.getState().showRightSidebarFiles()}>
            <FolderOpen />
            {translate('forflow.workbench.browseFiles', 'Files')}
          </DropdownMenuItem>
          {canReview && (
            <DropdownMenuItem
              onSelect={() => {
                const state = useAppStore.getState()
                state.setRightSidebarTab('source-control')
                state.setRightSidebarOpen(true)
              }}
            >
              <FileDiff />
              {translate('forflow.workbench.changes', 'Review changes')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

export function ForflowWorkspaceToolbar({
  worktreeId
}: {
  worktreeId?: string
}): React.JSX.Element | null {
  const canReview = useWorkspaceHasGitChanges(worktreeId)
  if (!isForflowBuild() || !worktreeId) {
    return null
  }
  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-end gap-1 border-b border-border bg-background px-3 py-2"
      data-forflow-session-toolbar=""
      data-native-chat-typing-redirect-ignore="true"
    >
      <ForflowAgentActions isGit={canReview} />
      <ForflowWorkspaceActions worktreeId={worktreeId} canReview={canReview} />
      <ForflowSessionGuide canReview={canReview} />
    </div>
  )
}
