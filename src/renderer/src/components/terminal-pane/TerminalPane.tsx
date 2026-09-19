import { forwardRef } from 'react'
import { TerminalPaneSurface } from './TerminalPaneSurface'
import { useTerminalPaneController } from './use-terminal-pane-controller'
import type { TerminalPaneHandle, TerminalPaneProps } from './terminal-pane-types'
import { isForflowBuild } from '../../../../shared/product-branding'
import { ForflowSessionToolbar } from './ForflowSessionToolbar'

export type { TerminalPaneHandle } from './terminal-pane-types'

function TerminalPane(
  props: TerminalPaneProps,
  ref: React.ForwardedRef<TerminalPaneHandle>
): React.JSX.Element {
  const controller = useTerminalPaneController(props, ref)
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

export default forwardRef(TerminalPane)
