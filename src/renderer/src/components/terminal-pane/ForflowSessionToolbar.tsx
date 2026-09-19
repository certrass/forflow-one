import { useLayoutEffect, useRef, useState } from 'react'
import { Columns2, FolderOpen, GitBranch, MessageSquare, SquareTerminal } from 'lucide-react'
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
import type { TerminalPaneController } from './use-terminal-pane-controller'

export function ForflowSessionToolbar({
  controller
}: {
  controller: TerminalPaneController
}): React.JSX.Element {
  const latest = useRef<TerminalPaneController | null>(controller)
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
    structuredSessionId,
    resolveAgentForLeaf,
    splitTerminalPaneFromHeader
  } = controller
  const agent = resolveAgentForLeaf(activePane?.leafId ?? null)
  const chatSelected = effectiveChatViewMode && activePaneIsChatLeaf
  const chatSupported = controller.isChatEligibleForLeaf(activePane?.leafId ?? null, true)
  const canOpenChat = activePaneCanToggleChat || chatSupported
  const status = structuredSessionId
    ? translate('forflow.workbench.structured', 'Structured conversation')
    : !canOpenChat
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
        current.structuredSessionId ||
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
      {structuredSessionId ? (
        <span className="text-xs text-muted-foreground">{status}</span>
      ) : (
        <>
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
        </>
      )}
      <div className="ml-auto flex items-center gap-1">
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
        <Button
          size="xs"
          variant="ghost"
          onClick={() =>
            useAppStore
              .getState()
              .openModal('new-workspace-composer', { telemetrySource: 'unknown' })
          }
        >
          <GitBranch />
          {translate('forflow.workbench.parallel', 'Parallel task')}
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => useAppStore.getState().showRightSidebarFiles()}
        >
          <FolderOpen />
          {translate('forflow.workbench.files', 'Files and results')}
        </Button>
      </div>
    </div>
  )
}
