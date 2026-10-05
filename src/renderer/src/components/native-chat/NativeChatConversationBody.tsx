import type { ReactNode } from 'react'
import { ForflowContextPreview } from './ForflowContextPreview'
import { NativeChatEmptyState } from './NativeChatEmptyState'
import type { NativeChatViewState } from './native-chat-view-state'
import {
  isNativeChatTranscriptUnsettled,
  type NativeChatLiveSession
} from './use-native-chat-live-session'

type Props = {
  session: NativeChatLiveSession
  viewState: NativeChatViewState
  paneKey: string
  worktreeId?: string
  isVisible: boolean
  initializing?: boolean
  deliveryPending?: boolean
  runtimeEnvironmentId?: string | null
  children: ReactNode
}

export function NativeChatConversationBody(props: Props): React.JSX.Element {
  const { session, viewState } = props
  return (
    <>
      {props.isVisible ? (
        <ForflowContextPreview
          agent={session.agent}
          scope={{
            sessionId: session.sessionId ?? '',
            paneKey: props.paneKey,
            workspaceId: props.worktreeId ?? null,
            runtimeEnvironmentId: props.runtimeEnvironmentId ?? null
          }}
          messages={session.messages}
          historyIncomplete={
            session.hasMore ||
            session.loadingEarlier ||
            isNativeChatTranscriptUnsettled(session.readPhase) ||
            props.initializing === true
          }
          sourceUnavailable={session.readPhase === 'error' || session.status === 'error'}
          deliveryPending={props.deliveryPending}
          busy={session.status === 'working'}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        {viewState.kind === 'loading' ? (
          <NativeChatEmptyState kind="loading" />
        ) : viewState.kind === 'error' ? (
          <NativeChatEmptyState kind="error" message={viewState.message} />
        ) : viewState.kind === 'empty' ? (
          <NativeChatEmptyState kind="empty" agent={session.agent} />
        ) : (
          props.children
        )}
      </div>
    </>
  )
}
