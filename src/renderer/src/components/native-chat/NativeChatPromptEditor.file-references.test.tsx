// @vitest-environment happy-dom
import { createRef } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NativeChatPromptEditor } from './NativeChatPromptEditor'
import type { NativeChatComposerInput } from './native-chat-composer-input'
import { promptEditor } from './native-chat-prompt-editor.test-support'

afterEach(cleanup)

function setup(value = '请检查', scopeKey?: string) {
  const inputRef = createRef<NativeChatComposerInput>()
  const props = {
    inputRef,
    scopeKey,
    initialValue: value,
    disabled: false,
    placeholder: 'Message',
    onChange: vi.fn(),
    onSelect: vi.fn()
  }
  const view = render(<NativeChatPromptEditor {...props} />)
  const input = inputRef.current!
  act(() => input.setSelectionRange(value.length, value.length))
  return { ...view, input, props, editor: promptEditor(screen.getByRole('textbox')) }
}

describe('file reference composer', () => {
  it.each([
    ['/资料/需求 文档.md', '@"/资料/需求 文档.md"'],
    ['C:\\团队\\notes.txt', '@C:\\团队\\notes.txt'],
    ['/repo/README.md', '@/repo/README.md']
  ])('shows a short name while sending the exact path %s', async (path, token) => {
    const { input, container, editor } = setup()
    await act(async () => input.insertFileReferences!([path]))
    const chip = container.querySelector('[data-native-chat-file-reference]')
    expect(chip?.getAttribute('title')).toBe(path)
    expect(chip?.textContent).toBe(path.split(/[\\/]/).pop())
    expect(input.value).toBe(`请检查 ${token} `)
    expect(editor.getText()).toBe(input.value)
    expect(input.selectionStart).toBe(input.value.length)
  })

  it('removes only the selected reference and allows undo', async () => {
    const { input, editor, container } = setup()
    await act(async () => input.insertFileReferences!(['/one/a.md', '/two/a.md']))
    const remove = screen.getAllByRole('button', { name: /Remove reference:/ })
    fireEvent.click(remove[0])
    expect(input.value).not.toContain('@/one/a.md')
    expect(input.value).toContain('@/two/a.md')
    await act(async () => editor.commands.undo())
    expect(container.querySelectorAll('[data-native-chat-file-reference]')).toHaveLength(2)
  })

  it('replaces a selection, preserves surrounding text, and clears on send', () => {
    const { input, container } = setup('前文占位后文')
    act(() => {
      input.setSelectionRange(2, 4)
      input.insertFileReferences!(['/repo/notes.md'])
    })
    expect(input.value).toBe('前文 @/repo/notes.md 后文')
    act(() => {
      input.value = ''
    })
    expect(container.querySelector('[data-native-chat-file-reference]')).toBeNull()
  })

  it('restores chips only in their owning draft and keeps pasted paths literal', async () => {
    const first = setup('材料', 'files-pane')
    await act(async () => first.input.insertFileReferences!(['/repo/a.md']))
    const draft = first.input.value
    first.unmount()
    const second = render(<NativeChatPromptEditor {...first.props} initialValue={draft} />)
    await waitFor(() =>
      expect(second.container.querySelector('[data-native-chat-file-reference]')).not.toBeNull()
    )
    second.unmount()
    const other = setup(draft, 'different-pane')
    expect(other.container.querySelector('[data-native-chat-file-reference]')).toBeNull()
    fireEvent.paste(screen.getByRole('textbox'), {
      clipboardData: { getData: () => '@/repo/b.md' }
    })
    expect(other.container.querySelector('[data-native-chat-file-reference]')).toBeNull()
  })
})
