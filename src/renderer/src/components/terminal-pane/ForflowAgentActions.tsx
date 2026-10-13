import { GitFork, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { AgentSessionContinuationMenuItem } from './AgentSessionContinuationMenuItem'
import type { TerminalPaneController } from './use-terminal-pane-controller'

export function ForflowAgentActions({
  controller,
  isGit
}: {
  controller?: TerminalPaneController
  isGit: boolean
}): React.JSX.Element {
  const activePane = controller?.activePane
  const activePaneCanContinueInNewSession = controller?.activePaneCanContinueInNewSession
  const contextMenu = controller?.contextMenu
  const isActive = controller?.isActive
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Network />
          {translate('forflow.collaboration.entry', 'Agent collaboration')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {activePane && isActive && contextMenu && activePaneCanContinueInNewSession && (
          <AgentSessionContinuationMenuItem
            onSelect={() =>
              contextMenu.runForPane(activePane.id, contextMenu.onContinueAgentSessionInNewSession)
            }
          />
        )}
        {activePane && isActive && contextMenu && isGit && (
          <DropdownMenuItem
            onSelect={() =>
              contextMenu.runForPane(activePane.id, () => void contextMenu.onForkAgentSession())
            }
          >
            <GitFork />
            {translate(
              'auto.components.terminal.pane.TerminalContextMenu.8a7ddb8b8a',
              'Fork Agent Session…'
            )}
          </DropdownMenuItem>
        )}
        {activePane && isActive && (isGit || activePaneCanContinueInNewSession) && (
          <DropdownMenuSeparator />
        )}
        <DropdownMenuItem
          onSelect={() => {
            const state = useAppStore.getState()
            state.setSettingsSearchQuery('')
            state.openSettingsTarget({ pane: 'orchestration', repoId: null })
            state.openSettingsPage()
          }}
        >
          <Network />
          {translate('forflow.collaboration.orchestration', 'Orchestration & examples')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
