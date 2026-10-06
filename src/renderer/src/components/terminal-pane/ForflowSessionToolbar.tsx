import { useLayoutEffect, useRef, useState } from 'react'
import { Columns2, FileDiff, FolderOpen, MessageSquare, SquareTerminal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import { formatAgentTypeLabel } from '@/lib/agent-status'
import { useAppStore } from '@/store'
import { isFolderRepo } from '../../../../shared/repo-kind'
import { parseWorkspaceKey } from '../../../../shared/workspace-scope'
import type { TerminalPaneController } from './use-terminal-pane-controller'
import { ForflowSessionGuide } from './ForflowSessionGuide'
import { ForflowParallelGuide } from './ForflowParallelGuide'

export function ForflowSessionToolbar({
  controller
}: {
  controller: TerminalPaneController
}): React.JSX.Element {
  const latest = useRef<TerminalPaneController | null>(controller)
  const canReview = useAppStore((state) => {
    if (parseWorkspaceKey(controller.worktreeId)?.type === 'folder') {
      return false
    }
    const worktree = state.getKnownWorktreeById(controller.worktreeId)
    const repo = state.repos.find((item) => item.id === worktree?.repoId)
    return Boolean(repo && !isFolderRepo(repo))
  })
  const [enabling, setEnabling] = useState(false)
  useLayoutEffect(() => {
    latest.current = controller
    return () => {
      latest.current = null
    }
  }, [controller])
  const {
    activePane,
    activePaneCanToggleChat,
    activePaneIsChatLeaf,
    effectiveChatViewMode,
    nativeChatEnabled,
    resolveAgentForLeaf,
    splitTerminalPaneFromHeader
  } = controller
  const agent = resolveAgentForLeaf(activePane?.leafId ?? null)
  const chatSelected = effectiveChatViewMode && activePaneIsChatLeaf
  const chatSupported = controller.isChatEligibleForLeaf(activePane?.leafId ?? null, true)
  const canOpenChat = activePaneCanToggleChat || chatSupported
  const status = !canOpenChat
    ? agent
      ? translate('forflow.workbench.terminalOnly', 'Chat is unavailable for this agent or host')
      : translate('forflow.workbench.shell', 'Start a supported agent to use chat')
    : !nativeChatEnabled
      ? translate('forflow.workbench.enableHint', 'Choose Chat to enable the conversation view')
      : agent
        ? formatAgentTypeLabel(agent)
        : ''

  const openChat = async (): Promise<void> => {
    if (chatSelected || !canOpenChat || enabling || !activePane) {
      return
    }
    const expected = { tabId: controller.tabId, leafId: activePane.leafId, agent }
    try {
      if (!nativeChatEnabled) {
        setEnabling(true)
        await useAppStore.getState().updateSettingsOrThrow({ experimentalNativeChat: true })
      }
      const current = latest.current
      // Enabling settings can outlive a pane switch; never route the click to a new target.
      if (
        !current ||
        current.tabId !== expected.tabId ||
        current.activePane?.leafId !== expected.leafId ||
        current.resolveAgentForLeaf(expected.leafId) !== expected.agent ||
        !current.isActive ||
        !current.isChatEligibleForLeaf(expected.leafId, true)
      ) {
        return
      }
      if (!current.effectiveChatViewMode || !current.activePaneIsChatLeaf) {
        current.handleToggleNativeChat()
      }
    } catch {
      toast.error(
        translate('forflow.workbench.enableError', 'Could not enable chat. Please try again.')
      )
    } finally {
      if (latest.current) {
        setEnabling(false)
      }
    }
  }

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-2 py-1"
      data-forflow-session-toolbar=""
      data-pane-prevent-terminal-focus=""
    >
      <ButtonGroup aria-label={translate('forflow.workbench.view', 'Session view')}>
        <Button
          size="xs"
          variant={chatSelected ? 'secondary' : 'ghost'}
          aria-pressed={chatSelected}
          disabled={!activePane || !canOpenChat || enabling}
          onClick={() => void openChat()}
        >
          <MessageSquare />
          {translate('forflow.workbench.chat', 'Chat')}
        </Button>
        <Button
          size="xs"
          variant={!chatSelected ? 'secondary' : 'ghost'}
          aria-pressed={!chatSelected}
          disabled={!activePane || enabling}
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
      <span className="min-w-0 truncate text-xs text-muted-foreground">{status}</span>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="xs" variant="ghost" disabled={!activePane}>
              <Columns2 />
              {translate('forflow.workbench.split', 'Split view')}
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
        <ForflowParallelGuide worktreeId={controller.worktreeId} isGit={canReview} />
        <Button
          size="xs"
          variant="ghost"
          onClick={() => useAppStore.getState().showRightSidebarFiles()}
        >
          <FolderOpen />
          {translate('forflow.workbench.browseFiles', 'Files')}
        </Button>
        {canReview ? (
          <Button
            size="xs"
            variant="ghost"
            title={translate(
              'forflow.workbench.changesHint',
              'Review all workspace changes; this does not commit or publish them'
            )}
            onClick={() => {
              const state = useAppStore.getState()
              state.setRightSidebarTab('source-control')
              state.setRightSidebarOpen(true)
            }}
          >
            <FileDiff />
            {translate('forflow.workbench.changes', 'Review changes')}
          </Button>
        ) : null}
        <ForflowSessionGuide canReview={canReview} />
      </div>
    </div>
  )
}
