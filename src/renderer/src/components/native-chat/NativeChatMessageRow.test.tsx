// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NativeChatMessage } from '../../../../shared/native-chat-types'
import { MessageRow } from './NativeChatMessageRow'
import { setRendererUiLanguage } from '@/i18n/i18n'

afterEach(cleanup)

function renderMessage(role: NativeChatMessage['role'], timestamp: number | null = 0) {
  return render(
    <MessageRow
      message={{
        id: 'message',
        role,
        timestamp,
        source: 'transcript',
        blocks: [{ type: 'text', text: 'Message text' }]
      }}
      expandSignal={false}
      onScrollMessageToTop={vi.fn()}
    />
  )
}

describe('MessageRow control visibility', () => {
  it('localizes the interruption status without rewriting user content or transcript data', async () => {
    const message: NativeChatMessage = {
      id: 'interrupted',
      role: 'system',
      timestamp: 0,
      source: 'transcript',
      blocks: [{ type: 'text', text: 'Conversation interrupted' }]
    }
    await setRendererUiLanguage('zh')
    try {
      const { rerender } = render(
        <MessageRow message={message} expandSignal={false} onScrollMessageToTop={vi.fn()} />
      )
      expect(screen.getByText('本轮已中断')).toBeInTheDocument()
      expect(screen.queryByText('Conversation interrupted')).toBeNull()
      expect(message.blocks).toEqual([{ type: 'text', text: 'Conversation interrupted' }])
      rerender(
        <MessageRow
          message={{ ...message, role: 'user' }}
          expandSignal={false}
          onScrollMessageToTop={vi.fn()}
        />
      )
      expect(screen.getByText('Conversation interrupted')).toBeInTheDocument()
      expect(screen.queryByText('本轮已中断')).toBeNull()
    } finally {
      await setRendererUiLanguage('en')
    }
  })

  it('renders and copies a fenced code block through the markdown path', async () => {
    const writeClipboardText = vi.fn().mockResolvedValue(undefined)
    Object.assign(window, { api: { ui: { writeClipboardText } } })

    render(
      <MessageRow
        message={{
          id: 'message',
          role: 'assistant',
          timestamp: 0,
          source: 'transcript',
          blocks: [{ type: 'text', text: '```ts\nconst answer = 42\n```' }]
        }}
        expandSignal={false}
        onScrollMessageToTop={vi.fn()}
      />
    )

    expect(screen.getByText('ts')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))

    await waitFor(() => {
      expect(writeClipboardText).toHaveBeenCalledWith('const answer = 42\n')
    })
  })

  it('appends time to the existing agent controls and inherits their reveal', () => {
    renderMessage('assistant')
    const copy = screen.getByRole('button', { name: 'Copy message' })
    const scroll = screen.getByRole('button', { name: 'Scroll this message to top' })
    const time = screen.getByRole('time')
    expect(Array.from(copy.parentElement!.children)).toEqual([copy, scroll, time])
    expect(copy.parentElement).toHaveClass(
      'can-hover:opacity-0',
      'can-hover:pointer-events-none',
      'group-hover:opacity-100',
      'group-has-[:focus-visible]:opacity-100',
      'group-hover:pointer-events-auto',
      'group-has-[:focus-visible]:pointer-events-auto'
    )
    expect(copy.parentElement).not.toHaveClass('opacity-0', 'pointer-events-none')
    expect(time).not.toHaveAttribute('tabindex')
    copy.focus()
    expect(copy).toHaveFocus()
  })

  it('gives user bubbles a timestamp that only hides on hover-capable devices', () => {
    renderMessage('user')
    const time = screen.getByRole('time')
    expect(screen.queryByRole('button')).toBeNull()
    expect(time).toHaveClass(
      'can-hover:opacity-0',
      'can-hover:pointer-events-none',
      'group-hover:opacity-100',
      'group-has-[:focus-visible]:opacity-100',
      'group-hover:pointer-events-auto',
      'group-has-[:focus-visible]:pointer-events-auto'
    )
    expect(time).not.toHaveClass('opacity-0', 'pointer-events-none')
    expect(time.parentElement).toHaveClass('group')
    time.focus()
    expect(time).toHaveFocus()
  })

  it.each(['assistant', 'user'] as const)('omits unknown timestamps on %s rows', (role) => {
    renderMessage(role, null)
    expect(screen.queryByRole('time')).toBeNull()
    expect(screen.getByText('Message text')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(role === 'assistant' ? 2 : 0)
  })

  it.each(['reasoning', 'system'] as const)('preserves chrome-free %s rows', (role) => {
    renderMessage(role)
    expect(screen.queryByRole('time')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
