import { ArrowUpRight } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import {
  getForflowDomesticConnections,
  FORFLOW_DOMESTIC_CONNECTIONS_SECTION
} from '@/lib/forflow-domestic-connections'
import { useAppStore } from '@/store'
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/dropdown-menu'

export function ForflowDomesticHistoryMenu(): React.JSX.Element {
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  const openSettingsPage = useAppStore((state) => state.openSettingsPage)
  return (
    <>
      <DropdownMenuLabel>
        {translate('forflow.domestic.title', 'Domestic models and agents')}
      </DropdownMenuLabel>
      {getForflowDomesticConnections().map((connection) => (
        <DropdownMenuItem
          key={connection.id}
          onSelect={() => {
            openSettingsTarget({
              pane: 'agents',
              repoId: null,
              sectionId: FORFLOW_DOMESTIC_CONNECTIONS_SECTION
            })
            openSettingsPage()
          }}
        >
          <ArrowUpRight className="size-3.5 shrink-0" />
          <span className="min-w-0">
            <span className="block">{connection.title}</span>
            <span className="block text-[11px] text-muted-foreground">{connection.history}</span>
          </span>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuLabel>
        {translate('forflow.domestic.historySources', 'Connected conversation-history sources')}
      </DropdownMenuLabel>
    </>
  )
}
