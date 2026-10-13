import { ForflowWorkspaceActions } from './ForflowWorkspaceActions'
import { Columns2, MessageSquare, SquareTerminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { isFolderRepo } from '../../../../shared/repo-kind'
import { parseWorkspaceKey } from '../../../../shared/workspace-scope'
import type { TerminalPaneController } from './use-terminal-pane-controller'
import { ForflowSessionGuide } from './ForflowSessionGuide'
import { ForflowAgentActions } from './ForflowAgentActions'

export function ForflowSessionToolbar({
  controller
}: {
  controller: TerminalPaneController
}): React.JSX.Element {
  const canReview = useAppStore((state) => {
    if (parseWorkspaceKey(controller.worktreeId)?.type === 'folder') {
      return false
    }
    const worktree = state.getKnownWorktreeById(controller.worktreeId)
    const repo = state.repos.find((item) => item.id === worktree?.repoId)
    return Boolean(repo && !isFolderRepo(repo))
  })
  const {
    activePane,
    activePaneCanToggleChat,
    activePaneIsChatLeaf,
    effectiveChatViewMode,
    resolveAgentForLeaf,
    splitTerminalPaneFromHeader
  } = controller
  const agent = resolveAgentForLeaf(activePane?.leafId ?? null)
  const chatSelected = effectiveChatViewMode && activePaneIsChatLeaf
  const chatSupported = controller.isChatEligibleForLeaf(activePane?.leafId ?? null)
  const canOpenChat = activePaneCanToggleChat || chatSupported
  const status = !canOpenChat
    ? agent
      ? translate('forflow.workbench.terminalOnly', 'Chat is unavailable for this agent or host')
      : translate('forflow.workbench.shell', 'Start an agent to switch to Chat')
    : ''

  const openChat = (): void => {
    if (chatSelected || !canOpenChat || !activePane || !controller.isActive) {
      return
    }
    controller.handleToggleNativeChat()
  }

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background px-3 py-2"
      data-forflow-session-toolbar=""
      data-pane-prevent-terminal-focus=""
    >
      <ButtonGroup aria-label={translate('forflow.workbench.view', 'Session view')}>
        <Button
          size="sm"
          variant={chatSelected ? 'secondary' : 'ghost'}
          aria-pressed={chatSelected}
          disabled={!activePane || !canOpenChat || !controller.isActive}
          onClick={() => void openChat()}
        >
          <MessageSquare />
          {translate('forflow.workbench.chat', 'Chat')}
        </Button>
        <Button
          size="sm"
          variant={!chatSelected ? 'secondary' : 'ghost'}
          aria-pressed={!chatSelected}
          disabled={!activePane || !controller.isActive}
          onClick={() => {
            if (chatSelected) {
              controller.handleToggleNativeChat()
            }
          }}
        >
          <SquareTerminal />
          {translate('forflow.workbench.terminal', 'Terminal')}
        </Button>
      </ButtonGroup>
      {status && <span className="min-w-0 text-xs text-muted-foreground">{status}</span>}
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <ForflowAgentActions controller={controller} isGit={canReview} />
        <ForflowWorkspaceActions worktreeId={controller.worktreeId} canReview={canReview} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={!activePane}
              aria-label={translate('forflow.workbench.split', 'Split view')}
              title={translate('forflow.workbench.split', 'Split view')}
            >
              <Columns2 />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                if (activePane) {
                  splitTerminalPaneFromHeader(activePane, 'vertical')
                }
              }}
            >
              {translate('forflow.workbench.splitRight', 'Open a terminal on the right')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                if (activePane) {
                  splitTerminalPaneFromHeader(activePane, 'horizontal')
                }
              }}
            >
              {translate('forflow.workbench.splitDown', 'Open a terminal below')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ForflowSessionGuide canReview={canReview} />
      </div>
    </div>
  )
}
