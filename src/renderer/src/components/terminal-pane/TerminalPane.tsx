import { TerminalPaneSurface } from './TerminalPaneSurface'
import { useTerminalPaneController } from './use-terminal-pane-controller'
import type { TerminalPaneProps } from './terminal-pane-types'
import { isForflowBuild } from '../../../../shared/product-branding'
import { ForflowSessionToolbar } from './ForflowSessionToolbar'

export default function TerminalPane(props: TerminalPaneProps): React.JSX.Element {
  const controller = useTerminalPaneController(props)
  if (!isForflowBuild() || props.showSplitButton === false) {
    return <TerminalPaneSurface controller={controller} />
  }
  return (
    <div className="absolute inset-0 flex min-h-0 min-w-0 flex-col">
      <ForflowSessionToolbar controller={controller} />
      <div className="relative min-h-0 min-w-0 flex-1">
        <TerminalPaneSurface controller={controller} />
      </div>
    </div>
  )
}
