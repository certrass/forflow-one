import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NativeChatMessage } from '../../../src/shared/native-chat-types'
import { MobileNativeChatView } from './MobileNativeChatView'

const scrollToEnd = vi.hoisted(() => vi.fn())
const scrollToOffset = vi.hoisted(() => vi.fn())

vi.mock('react-native', async () => {
  const React = await import('react')
  return {
    ActivityIndicator: 'ActivityIndicator',
    FlatList: React.forwardRef(
      (
        props: { data: NativeChatMessage[]; ListEmptyComponent?: import('react').ReactNode },
        ref
      ) => {
        React.useImperativeHandle(ref, () => ({ scrollToEnd, scrollToOffset }), [])
        return React.createElement(
          'FlatList',
          props,
          props.data.length === 0 ? props.ListEmptyComponent : null
        )
      }
    ),
    Pressable: 'Pressable',
    StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
    Text: 'Text',
    View: 'View'
  }
})

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}))

vi.mock('react-native-gesture-handler', () => {
  const chain = {
    runOnJS: () => chain,
    onStart: () => chain,
    onUpdate: () => chain
  }
  return {
    Gesture: { Simultaneous: () => ({}), Native: () => ({}), Pinch: () => chain },
    GestureDetector: 'GestureDetector',
    GestureHandlerRootView: 'GestureHandlerRootView'
  }
})

vi.mock('lucide-react-native', () => ({
  ArrowDown: 'ArrowDown',
  ChevronsDownUp: 'ChevronsDownUp',
  ChevronsUpDown: 'ChevronsUpDown',
  Square: 'Square'
}))

vi.mock('./MobileNativeChatMessage', () => ({ MobileNativeChatMessage: 'ChatMessage' }))
vi.mock('./MobileNativeChatAsk', () => ({ MobileNativeChatAsk: 'ChatAsk' }))
vi.mock('./MobileNativeChatPermission', () => ({ MobileNativeChatPermission: 'ChatPermission' }))
vi.mock('./MobileNativeChatQuestion', () => ({ MobileNativeChatQuestion: 'ChatQuestion' }))
vi.mock('./MobileAgentWorkingIndicator', () => ({
  MobileAgentWorkingIndicator: 'WorkingIndicator'
}))

// Stand-in composer: exposes the view's `handleSend` through a pressable, which is
// the only composer behaviour these banner tests exercise.
vi.mock('./MobileNativeChatComposer', async () => {
  const React = await import('react')
  return {
    MobileNativeChatComposer: (props: {
      onSend: (text: string) => Promise<boolean>
      disabled?: boolean
      placeholder?: string
    }) =>
      React.createElement('Composer', {
        ...props,
        accessibilityLabel: 'Send message',
        onPress: () => props.onSend('hi')
      })
  }
})

type Overrides = Partial<Parameters<typeof MobileNativeChatView>[0]>

function assistantTurn(id: string, text: string): NativeChatMessage {
  return { id, role: 'assistant', blocks: [{ type: 'text', text }], timestamp: 0, source: 'hook' }
}

function chatViewElement(overrides: Overrides) {
  return createElement(MobileNativeChatView, {
    messages: [],
    folded: [],
    status: 'ready',
    streaming: null,
    onSend: vi.fn().mockResolvedValue(true),
    sendSurfaceId: 'tab-a',
    getSendCompletionGeneration: () => 0,
    getComposerEditGeneration: () => 0,
    pending: [],
    composerText: '',
    onComposerTextChange: vi.fn(),
    ...overrides
  })
}

describe('mobile first-message guidance', () => {
  let renderer: ReactTestRenderer | null = null
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      setTimeout(() => callback(0), 0)
    )
    vi.stubGlobal('cancelAnimationFrame', clearTimeout)
  })
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    vi.unstubAllGlobals()
  })
  async function render(overrides: Overrides = {}) {
    await act(async () => {
      renderer = create(chatViewElement(overrides))
    })
  }
  async function update(overrides: Overrides = {}) {
    await act(async () => {
      renderer?.update(chatViewElement(overrides))
    })
  }
  it('fills a starter into the draft without sending, then preserves the user draft', async () => {
    const onComposerTextChange = vi.fn()
    const onSend = vi.fn()
    await render({ onComposerTextChange, onSend })
    const starters = () =>
      renderer!.root.findAll(
        (node) => node.props.accessibilityHint === '填入输入框，修改后点击发送'
      )
    expect(starters()).toHaveLength(2)
    act(() => starters()[0].props.onPress())
    expect(onComposerTextChange).toHaveBeenCalledWith(
      '请先查看这个工作区，概括主要内容和当前进展，暂时不要修改文件。'
    )
    expect(onSend).not.toHaveBeenCalled()
    await update({ composerText: '我的草稿', onComposerTextChange, onSend })
    expect(starters()).toHaveLength(0)
  })

  it.each([
    { inputLockReason: 'disconnected' as const },
    { agentWorking: true },
    { status: 'error' as const },
    {
      messages: [assistantTurn('answer', '已有回复')],
      folded: [assistantTurn('answer', '已有回复')]
    }
  ])(
    'does not offer first-message examples for an unavailable or existing conversation: %j',
    async (overrides) => {
      await render(overrides)
      expect(
        renderer!.root.findAll(
          (node) => node.props.accessibilityHint === '填入输入框，修改后点击发送'
        )
      ).toHaveLength(0)
    }
  )
})
