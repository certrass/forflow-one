// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TerminalPaneController } from './use-terminal-pane-controller'
import { ForflowSessionToolbar } from './ForflowSessionToolbar'

const mocks = vi.hoisted(() => ({
  updateSettingsOrThrow: vi.fn(),
  openModal: vi.fn(),
  showRightSidebarFiles: vi.fn(),
  setRightSidebarTab: vi.fn(),
  setRightSidebarOpen: vi.fn(),
  getKnownWorktreeById: vi.fn(() => ({ repoId: 'repo-1' })),
  repos: [{ id: 'repo-1', kind: 'git' }],
  error: vi.fn()
}))
vi.mock('@/store', () => ({
  useAppStore: Object.assign((selector: (state: typeof mocks) => unknown) => selector(mocks), {
    getState: () => mocks
  })
}))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))
vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))

function fixture(overrides: Partial<TerminalPaneController> = {}): TerminalPaneController {
  const value = {
    tabId: 'terminal-1',
    worktreeId: 'workspace-1',
    activePane: { id: 1, leafId: 'leaf-1' },
    activePaneCanToggleChat: true,
    activePaneIsChatLeaf: false,
    effectiveChatViewMode: false,
    nativeChatEnabled: true,
    structuredSessionId: null,
    isActive: true,
    resolveAgentForLeaf: vi.fn(() => 'codex'),
    isChatEligibleForLeaf: vi.fn(() => true),
    splitTerminalPaneFromHeader: vi.fn(),
    handleToggleNativeChat: vi.fn(),
    ...overrides
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: This fixture supplies every controller field read by the toolbar; no terminal runtime is invoked.
  return value as TerminalPaneController
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.updateSettingsOrThrow.mockResolvedValue(undefined)
  mocks.repos[0].kind = 'git'
})
afterEach(cleanup)

describe('Forflow session toolbar', () => {
  it('switches only through the existing pane controller and leaves selected views unchanged', async () => {
    const controller = fixture()
    const view = render(<ForflowSessionToolbar controller={controller} />)
    fireEvent.click(screen.getByRole('button', { name: 'Terminal' }))
    expect(controller.handleToggleNativeChat).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }))
    await waitFor(() => expect(controller.handleToggleNativeChat).toHaveBeenCalledTimes(1))
    view.rerender(
      <ForflowSessionToolbar
        controller={{ ...controller, activePaneIsChatLeaf: true, effectiveChatViewMode: true }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }))
    expect(controller.handleToggleNativeChat).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Terminal' }))
    expect(controller.handleToggleNativeChat).toHaveBeenCalledTimes(2)
    expect(mocks.updateSettingsOrThrow).not.toHaveBeenCalled()
  })

  it('enables an existing profile without enabling structured sessions or changing its default view', async () => {
    const controller = fixture({ nativeChatEnabled: false, activePaneCanToggleChat: false })
    render(<ForflowSessionToolbar controller={controller} />)
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }))
    await waitFor(() => expect(controller.handleToggleNativeChat).toHaveBeenCalledOnce())
    expect(mocks.updateSettingsOrThrow).toHaveBeenCalledExactlyOnceWith({
      experimentalNativeChat: true
    })
  })

  it.each(['changed-pane', 'closed', 'agent-exited', 'hidden'] as const)(
    'does not misroute a delayed enable after %s',
    async (change) => {
      let settle: () => void = () => {}
      mocks.updateSettingsOrThrow.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            settle = resolve
          })
      )
      const controller = fixture({ nativeChatEnabled: false, activePaneCanToggleChat: false })
      const view = render(<ForflowSessionToolbar controller={controller} />)
      fireEvent.click(screen.getByRole('button', { name: 'Chat' }))
      if (change === 'closed') {
        view.unmount()
      } else {
        view.rerender(
          <ForflowSessionToolbar
            controller={{
              ...controller,
              tabId: change === 'changed-pane' ? 'terminal-2' : controller.tabId,
              isActive: change !== 'hidden',
              isChatEligibleForLeaf: () => change !== 'agent-exited'
            }}
          />
        )
      }
      await act(async () => {
        settle()
      })
      expect(controller.handleToggleNativeChat).not.toHaveBeenCalled()
    }
  )

  it('retains the terminal if saving the feature setting fails', async () => {
    mocks.updateSettingsOrThrow.mockRejectedValue(new Error('offline'))
    const controller = fixture({ nativeChatEnabled: false })
    render(<ForflowSessionToolbar controller={controller} />)
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }))
    await waitFor(() => expect(mocks.error).toHaveBeenCalledOnce())
    expect(controller.handleToggleNativeChat).not.toHaveBeenCalled()
  })

  it('explains an unsupported terminal agent and keeps its terminal view available', () => {
    const controller = fixture({
      activePaneCanToggleChat: false,
      isChatEligibleForLeaf: () => false
    })
    render(<ForflowSessionToolbar controller={controller} />)
    expect(screen.getByText('Chat is unavailable for this agent or host')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Chat' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Terminal' }).hasAttribute('disabled')).toBe(false)
  })

  it('opens the existing task composer and file preview without starting a task', () => {
    render(<ForflowSessionToolbar controller={fixture()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Parallel task' }))
    expect(mocks.openModal).toHaveBeenCalledExactlyOnceWith('new-workspace-composer', {
      telemetrySource: 'unknown'
    })
    fireEvent.click(screen.getByRole('button', { name: 'Files' }))
    expect(mocks.showRightSidebarFiles).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }))
    expect(mocks.setRightSidebarTab).toHaveBeenCalledExactlyOnceWith('source-control')
    expect(mocks.setRightSidebarOpen).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('keeps files available without offering Git review for a folder project', () => {
    mocks.repos[0].kind = 'folder'
    render(<ForflowSessionToolbar controller={fixture()} />)
    expect(screen.queryByRole('button', { name: 'Review changes' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Files' })).toBeTruthy()
  })
})
