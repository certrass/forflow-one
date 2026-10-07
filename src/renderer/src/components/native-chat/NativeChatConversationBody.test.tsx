// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { NativeChatConversationBody } from './NativeChatConversationBody'
import type { NativeChatLiveSession } from './use-native-chat-live-session'

vi.mock('@/store', () => ({
  useAppStore: (select: (state: unknown) => unknown) =>
    select({ settings: { forflowContextPreviewBeta: true } })
}))
vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))
vi.mock('./NativeChatEmptyState', () => ({ NativeChatEmptyState: () => null }))
afterEach(cleanup)

const session: NativeChatLiveSession = {
  agent: 'codex',
  sessionId: 's1',
  status: 'ready',
  readPhase: 'ready',
  messages: [
    {
      id: 'u1',
      role: 'user',
      source: 'transcript',
      timestamp: 1,
      blocks: [{ type: 'text', text: 'Existing constraint' }]
    }
  ],
  hasMore: false,
  loadingEarlier: false,
  olderHistoryGeneration: 0,
  loadEarlier: async () => 'exhausted'
}

it('retains readable history after read failure without allowing it to be copied as settled', () => {
  render(
    <NativeChatConversationBody
      session={{ ...session, readPhase: 'error' }}
      viewState={{ kind: 'ready', isWorking: false }}
      paneKey="tab:leaf"
      isVisible
    >
      Retained conversation
    </NativeChatConversationBody>
  )
  expect(screen.getByText('Retained conversation')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Copy conversation' }))
  expect(screen.getByRole('button', { name: 'Copy to clipboard' }).hasAttribute('disabled')).toBe(
    true
  )
})

it('blocks a send awaiting transcript confirmation and retains the source runtime identity', () => {
  const view = render(
    <NativeChatConversationBody
      session={session}
      viewState={{ kind: 'ready', isWorking: false }}
      paneKey="tab:leaf"
      runtimeEnvironmentId="host-a"
      deliveryPending
      isVisible
    >
      Conversation
    </NativeChatConversationBody>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Copy conversation' }))
  expect(screen.getByText(/Send or retry the pending messages/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Copy to clipboard' }).hasAttribute('disabled')).toBe(
    true
  )
  view.rerender(
    <NativeChatConversationBody
      session={session}
      viewState={{ kind: 'ready', isWorking: false }}
      paneKey="tab:leaf"
      runtimeEnvironmentId="host-b"
      isVisible
    >
      Conversation
    </NativeChatConversationBody>
  )
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('keeps a handoff unavailable while the host reports background child work', () => {
  render(
    <NativeChatConversationBody
      session={session}
      viewState={{ kind: 'ready', isWorking: false }}
      paneKey="tab:leaf"
      busy
      isVisible
    >
      Conversation
    </NativeChatConversationBody>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Copy conversation' }))
  expect(screen.getByRole('button', { name: 'Copy to clipboard' }).hasAttribute('disabled')).toBe(
    true
  )
})

it('preserves the structured host read failure and retry notice', () => {
  render(
    <NativeChatConversationBody
      session={session}
      viewState={{ kind: 'error', message: 'Generic read failure' }}
      paneKey="tab:leaf"
      isVisible
      errorState={<p>Host reconnecting; history will retry</p>}
    >
      Unavailable conversation
    </NativeChatConversationBody>
  )
  expect(screen.getByText('Host reconnecting; history will retry')).toBeTruthy()
  expect(screen.queryByText('Unavailable conversation')).toBeNull()
})
