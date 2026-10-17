import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileHomeTasksCard } from './MobileHomeTasksCard'

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: <T,>(styles: T) => styles }
}))
vi.mock('lucide-react-native', () => ({ ChevronRight: 'ChevronRight', ListTodo: 'ListTodo' }))
vi.mock('../components/TaskProviderLogo', () => ({ TaskProviderLogo: () => null }))

let renderer: ReactTestRenderer
afterEach(() => act(() => renderer?.unmount()))

describe('home task source actions', () => {
  it('disables task navigation and hides source shortcuts while disconnected', async () => {
    const onOpen = vi.fn()
    await act(() => {
      renderer = create(
        createElement(MobileHomeTasksCard, { enabled: false, providers: ['github'], onOpen })
      )
    })
    const controls = renderer.root.findAllByProps({ accessibilityRole: 'button' })
    expect(controls).toHaveLength(1)
    expect(controls[0].props.disabled).toBe(true)
    expect(controls[0].props.accessibilityLabel).toContain('连接电脑后查看任务列表')
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('opens the selected provider without also opening the generic task list', async () => {
    const onOpen = vi.fn()
    await act(() => {
      renderer = create(
        createElement(MobileHomeTasksCard, {
          enabled: true,
          providers: ['github', 'gitlab'],
          onOpen
        })
      )
    })
    const provider = renderer.root.findByProps({ accessibilityLabel: '查看 GitLab 任务' })
    expect(provider.parent?.props.accessibilityRole).not.toBe('button')
    act(() => provider.props.onPress())
    expect(onOpen).toHaveBeenCalledExactlyOnceWith('gitlab')
  })

  it('keeps the task list reachable with a setup hint when no providers are configured', async () => {
    const onOpen = vi.fn()
    await act(() => {
      renderer = create(
        createElement(MobileHomeTasksCard, { enabled: true, providers: [], onOpen })
      )
    })
    const button = renderer.root.findByProps({ accessibilityRole: 'button' })
    expect(button.props.disabled).toBe(false)
    expect(button.props.accessibilityLabel).toContain('在电脑端连接 GitHub、GitLab 或 Linear')
    act(() => button.props.onPress())
    expect(onOpen).toHaveBeenCalledExactlyOnceWith()
  })
})
