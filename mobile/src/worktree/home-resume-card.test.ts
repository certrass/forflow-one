import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { MobileHomeResumeCard } from '../home/MobileHomeResumeCard'
import {
  isResumeTargetConfirmedMissing,
  selectHomeResumeCard,
  type HomeResumeCardInput
} from './home-resume-card'
import type { HomeWorktreeSummary, HostWorktreeInfo } from './home-worktree-info'

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: <T>(styles: T) => styles }
}))
vi.mock('lucide-react-native', () => ({ ArrowUpRight: 'ArrowUpRight' }))

function worktree(worktreeId: string): HomeWorktreeSummary {
  return {
    worktreeId,
    repo: 'orca',
    branch: 'main',
    displayName: worktreeId,
    liveTerminalCount: 0
  }
}

function info(hostId: string, lastActive: HomeWorktreeSummary | null): HostWorktreeInfo {
  return { hostId, totalWorktrees: 1, activeCount: 0, lastActiveWorktree: lastActive }
}

function input(overrides: Partial<HomeResumeCardInput> = {}): HomeResumeCardInput {
  return {
    hosts: [{ id: 'host-1' }],
    hostStates: {},
    worktreeInfo: { 'host-1': info('host-1', worktree('repo::/tmp/wt')) },
    lastVisited: null,
    cachedWorktrees: () => null,
    ...overrides
  }
}

describe('home resume card', () => {
  it('reserves the slot from snapshot data while the host is still connecting', () => {
    const connecting = selectHomeResumeCard(input({ hostStates: { 'host-1': 'connecting' } }))

    expect(connecting).toEqual({
      hostId: 'host-1',
      worktree: worktree('repo::/tmp/wt'),
      actionable: false
    })
  })

  it('keeps the same card in place once the host connects, only enabling it', () => {
    const before = selectHomeResumeCard(input({ hostStates: { 'host-1': 'connecting' } }))
    const after = selectHomeResumeCard(input({ hostStates: { 'host-1': 'connected' } }))

    // Same host and worktree before and after: the footer's Tasks card cannot shift down.
    expect(after?.hostId).toBe(before?.hostId)
    expect(after?.worktree.worktreeId).toBe(before?.worktree.worktreeId)
    expect(after?.actionable).toBe(true)
  })

  it('omits resume when no host has workspace history', () => {
    expect(
      selectHomeResumeCard(input({ worktreeInfo: { 'host-1': info('host-1', null) } }))
    ).toBeNull()
  })

  it('prefers the worktree last opened on this device, enabled with its host', () => {
    const visited = worktree('repo::/tmp/visited')
    const fromLastVisited = (state: 'connecting' | 'connected') =>
      selectHomeResumeCard(
        input({
          hostStates: { 'host-1': state },
          lastVisited: { hostId: 'host-1', worktreeId: visited.worktreeId },
          cachedWorktrees: (hostId) => (hostId === 'host-1' ? [visited] : null)
        })
      )

    expect(fromLastVisited('connecting')).toEqual({
      hostId: 'host-1',
      worktree: visited,
      actionable: false
    })
    expect(fromLastVisited('connected')?.actionable).toBe(true)
  })

  it('prefers a connected host over an unconnected one holding older snapshot data', () => {
    const card = selectHomeResumeCard(
      input({
        hosts: [{ id: 'host-1' }, { id: 'host-2' }],
        hostStates: { 'host-1': 'connecting', 'host-2': 'connected' },
        worktreeInfo: {
          'host-1': info('host-1', worktree('repo::/tmp/one')),
          'host-2': info('host-2', worktree('repo::/tmp/two'))
        }
      })
    )

    expect(card).toEqual({
      hostId: 'host-2',
      worktree: worktree('repo::/tmp/two'),
      actionable: true
    })
  })

  it('gives a connected host precedence over an offline last-visited worktree', () => {
    const visited = worktree('repo::/tmp/visited')
    const card = selectHomeResumeCard(
      input({
        hosts: [{ id: 'host-1' }, { id: 'host-2' }],
        hostStates: { 'host-1': 'disconnected', 'host-2': 'connected' },
        worktreeInfo: { 'host-2': info('host-2', worktree('repo::/tmp/two')) },
        lastVisited: { hostId: 'host-1', worktreeId: visited.worktreeId },
        cachedWorktrees: (hostId) => (hostId === 'host-1' ? [visited] : null)
      })
    )

    // Reserving the slot must not cost the user a card they could actually open.
    expect(card).toEqual({
      hostId: 'host-2',
      worktree: worktree('repo::/tmp/two'),
      actionable: true
    })
  })

  it('keeps the cached workspace readable but inert until its host connects', async () => {
    const card = { hostId: 'host-1', worktree: worktree('repo::/tmp/wt'), actionable: false }
    const onOpen = vi.fn()
    let renderer!: ReactTestRenderer
    await act(() => {
      renderer = create(createElement(MobileHomeResumeCard, { card, onOpen }))
    })
    try {
      const button = () => renderer.root.findByProps({ accessibilityRole: 'button' })
      expect(button().props.disabled).toBe(true)
      expect(button().props.accessibilityState).toEqual({ disabled: true })
      expect(button().props.accessibilityLabel).toContain('连接电脑后继续')
      expect(JSON.stringify(renderer.toJSON())).toContain('repo::/tmp/wt')
      expect(onOpen).not.toHaveBeenCalled()

      const connected = { ...card, actionable: true }
      await act(() =>
        renderer.update(createElement(MobileHomeResumeCard, { card: connected, onOpen }))
      )
      expect(button().props.disabled).toBe(false)
      act(() => button().props.onPress())
      expect(onOpen).toHaveBeenCalledWith(connected)
    } finally {
      act(() => renderer.unmount())
    }
  })
})

// Why (F7): the card is drawn from a snapshot that can name a workspace the desktop deleted
// while the phone was away, and tapping it lands on a session screen whose every RPC fails.
describe('isResumeTargetConfirmedMissing', () => {
  const card = {
    hostId: 'host-1',
    worktree: worktree('repo::/tmp/wt'),
    actionable: true
  } as const

  it('confirms a target the host listed without', () => {
    expect(isResumeTargetConfirmedMissing(card, [{ worktreeId: 'repo::/tmp/other' }])).toBe(true)
  })

  it('clears a target present in the listing', () => {
    expect(
      isResumeTargetConfirmedMissing(card, [
        { worktreeId: 'repo::/tmp/other' },
        { worktreeId: 'repo::/tmp/wt' }
      ])
    ).toBe(false)
  })

  // An unproven catalog is silence, not evidence — the session screen bounces later instead.
  it('never confirms without a proven catalog', () => {
    expect(isResumeTargetConfirmedMissing(card, null)).toBe(false)
  })

  it('confirms the target when the host proves it has no workspaces at all', () => {
    expect(isResumeTargetConfirmedMissing(card, [])).toBe(true)
  })

  it('exempts synthetic routes the catalog can never list', () => {
    const folder = { ...card, worktree: worktree('folder:/Users/x/dir') }
    const floating = { ...card, worktree: worktree('global-floating-terminal') }

    expect(isResumeTargetConfirmedMissing(folder, [])).toBe(false)
    expect(isResumeTargetConfirmedMissing(floating, [])).toBe(false)
  })
})
