// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { ForflowContextPreview } from './ForflowContextPreview'
import type { NativeChatMessage } from '../../../../shared/native-chat-types'

const mock = vi.hoisted(() => ({ enabled: true, writeText: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/store', () => ({
  useAppStore: (
    selector: (state: { settings: { forflowContextPreviewBeta: boolean } }) => unknown
  ) => selector({ settings: { forflowContextPreviewBeta: mock.enabled } })
}))
vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
beforeEach(() => {
  mock.enabled = true
  mock.writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: mock.writeText }
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const messages: NativeChatMessage[] = [
  {
    id: 'u1',
    source: 'transcript',
    role: 'user',
    timestamp: 1,
    blocks: [{ type: 'text', text: 'Do not publish this task.' }]
  }
]
const props = {
  agent: 'codex' as const,
  scope: { sessionId: 's1', paneKey: 'tab:leaf', workspaceId: 'folder:project' },
  messages,
  historyIncomplete: false,
  busy: false
}
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Copy conversation' }))
const copy = () => screen.getByRole('button', { name: 'Copy content' })

it('is absent unless explicitly enabled, and remains Codex-only', () => {
  mock.enabled = false
  const view = render(<ForflowContextPreview {...props} />)
  expect(screen.queryByRole('button')).toBeNull()
  mock.enabled = true
  view.rerender(<ForflowContextPreview {...props} agent="claude" />)
  expect(screen.queryByRole('button')).toBeNull()
})

it('prepares a preview on demand and copies only after an explicit click', async () => {
  render(<ForflowContextPreview {...props} />)
  expect(mock.writeText).not.toHaveBeenCalled()
  open()
  expect(screen.getByText('Do not publish this task.')).toBeTruthy()
  expect(mock.writeText).not.toHaveBeenCalled()
  fireEvent.click(copy())
  await waitFor(() => expect(mock.writeText).toHaveBeenCalledOnce())
  expect(mock.writeText.mock.calls[0][0]).toBe(
    'Conversation excerpt\n\nUser\nDo not publish this task.'
  )
})

it('invalidates an open preview when messages change and can refresh it', () => {
  const view = render(<ForflowContextPreview {...props} />)
  open()
  const updated = [
    ...messages,
    { ...messages[0], id: 'u2', blocks: [{ type: 'text' as const, text: 'New scope: only read.' }] }
  ]
  view.rerender(<ForflowContextPreview {...props} messages={updated} />)
  expect(copy().hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh content' }))
  expect(copy().hasAttribute('disabled')).toBe(false)
  expect(screen.getByText('New scope: only read.')).toBeTruthy()
})

it('closes a previous pane snapshot on scope changes', () => {
  const view = render(<ForflowContextPreview {...props} />)
  open()
  view.rerender(
    <ForflowContextPreview {...props} scope={{ ...props.scope, paneKey: 'tab:other' }} />
  )
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(mock.writeText).not.toHaveBeenCalled()
})

it.each([{ historyIncomplete: true }, { busy: true }])(
  'blocks copying incomplete or in-flight context: %j',
  (change) => {
    render(<ForflowContextPreview {...props} {...change} />)
    open()
    expect(copy().hasAttribute('disabled')).toBe(true)
    expect(mock.writeText).not.toHaveBeenCalled()
  }
)

it.each([
  { busy: true },
  { historyIncomplete: true },
  { sourceUnavailable: true },
  { deliveryPending: true }
])('requires a refresh even after a temporary unsafe state clears: %j', (change) => {
  const view = render(<ForflowContextPreview {...props} />)
  open()
  view.rerender(<ForflowContextPreview {...props} {...change} />)
  view.rerender(<ForflowContextPreview {...props} />)
  expect(copy().hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh content' }))
  expect(copy().hasAttribute('disabled')).toBe(false)
})

it.each(['close', 'scope', 'busy', 'disable'] as const)(
  'does not copy if %s occurs while the receipt is hashing',
  async (change) => {
    const deferred = Promise.withResolvers<ArrayBuffer>()
    vi.spyOn(crypto.subtle, 'digest').mockImplementationOnce(() => deferred.promise)
    const view = render(<ForflowContextPreview {...props} />)
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Source details' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy source receipt' }))
    if (change === 'close') {
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    } else if (change === 'scope') {
      view.rerender(
        <ForflowContextPreview
          {...props}
          scope={{ ...props.scope, runtimeEnvironmentId: 'remote-b' }}
        />
      )
    } else if (change === 'busy') {
      view.rerender(<ForflowContextPreview {...props} busy />)
      view.rerender(<ForflowContextPreview {...props} />)
    } else {
      mock.enabled = false
      view.rerender(<ForflowContextPreview {...props} />)
    }
    await act(async () => deferred.resolve(new ArrayBuffer(32)))
    expect(mock.writeText).not.toHaveBeenCalled()
  }
)

it('explains a failed read and allows retry after clipboard failure', async () => {
  const view = render(<ForflowContextPreview {...props} sourceUnavailable />)
  open()
  expect(screen.getByText(/Could not read the conversation/)).toBeTruthy()
  expect(copy().hasAttribute('disabled')).toBe(true)
  view.rerender(<ForflowContextPreview {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh content' }))
  mock.writeText.mockRejectedValueOnce(new Error('Denied'))
  fireEvent.click(copy())
  await waitFor(() => expect(toast.error).toHaveBeenCalled())
  expect(copy().hasAttribute('disabled')).toBe(false)
  fireEvent.click(copy())
  await waitFor(() => expect(mock.writeText).toHaveBeenCalledTimes(2))
})

it('keeps source metadata in details and offers the original hashed receipt separately', async () => {
  render(<ForflowContextPreview {...props} />)
  open()
  expect(screen.queryByText('s1')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Copy source receipt' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Source details' }))
  expect(screen.getByText('s1')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Copy source receipt' }))
  await waitFor(() => expect(mock.writeText).toHaveBeenCalledOnce())
  const receipt = JSON.parse(mock.writeText.mock.calls[0][0])
  expect(receipt.packet.scope).toEqual(props.scope)
  expect(receipt.sha256).toMatch(/^[a-f0-9]{64}$/)
})
