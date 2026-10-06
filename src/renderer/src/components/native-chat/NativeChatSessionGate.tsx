import { isCompanionAgent } from '../../../../shared/forflow-companion'
import { useEffect, useRef, type JSX, type ReactNode } from 'react'
import { NativeChatEmptyState } from './NativeChatEmptyState'
import { translate } from '@/i18n/i18n'
import { ailySessionHint } from '@/lib/forflow-companion-catalog'
import {
  resolveNativeChatSession,
  type NativeChatPaneResolution,
  type NativeChatPaneResolutionInput
} from './native-chat-pane-resolution'

export type NativeChatSessionGateProps = NativeChatPaneResolutionInput & {
  children: (resolution: NativeChatPaneResolution) => ReactNode
  onSwitchToTerminal?: () => void
}

/** Keeps NativeChatView's agent/session resolution separate from the heavy
 *  conversation surface so unsupported panes fail before transcript IO starts. */
export function NativeChatSessionGate({
  children,
  onSwitchToTerminal,
  ...input
}: NativeChatSessionGateProps): JSX.Element {
  const lastResolutionRef = useRef<NativeChatPaneResolution | null>(null)
  const currentResolution = resolveNativeChatSession(input)
  const previousResolution =
    lastResolutionRef.current?.paneKey === input.paneKey ? lastResolutionRef.current : null
  const resolution = (() => {
    if (!currentResolution) {
      return previousResolution
    }
    if (
      previousResolution?.agent === currentResolution.agent &&
      previousResolution.sessionId &&
      !currentResolution.sessionId
    ) {
      // Why: reconnect snapshots can retain a pane/agent fallback while briefly
      // omitting provider-session metadata. Keep the conversation generation
      // stable so transcript IO and the composer do not reset mid-reconnect.
      return {
        ...currentResolution,
        sessionId: previousResolution.sessionId,
        transcriptPath: previousResolution.transcriptPath
      }
    }
    return currentResolution
  })()
  useEffect(() => {
    if (resolution) {
      // Why: hook and title evidence are transport-fed and can vanish between a
      // disconnect and replay. Commit the last rendered conversation identity.
      lastResolutionRef.current = resolution
    }
  }, [resolution])
  if (!resolution) {
    return <NativeChatEmptyState kind="not-agent" />
  }
  if (isCompanionAgent(resolution.agent) && !input.agentStatusEntry?.providerSession?.id) {
    return (
      <NativeChatEmptyState
        kind="loading"
        headline={translate('forflow.companion.connecting', 'Connect your work partner')}
        message={resolution.agent === 'aily' ? ailySessionHint() : undefined}
        action={
          onSwitchToTerminal
            ? {
                label: translate('forflow.companion.connectionProgress', 'View connection details'),
                onClick: onSwitchToTerminal
              }
            : undefined
        }
      />
    )
  }
  return <>{children(resolution)}</>
}
