import type * as ProductBranding from '../../../../shared/product-branding'
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TerminalPaneController } from './use-terminal-pane-controller'
import { ForflowSessionToolbar } from './ForflowSessionToolbar'
import { ForflowWorkspaceToolbar } from './ForflowWorkspaceActions'

const mocks = vi.hoisted(() => ({
  updateSettingsOrThrow: vi.fn(),
  openModal: vi.fn(),
  resolveHost: vi.fn((): string | null => 'local'),
  setSettingsSearchQuery: vi.fn(),
  openSettingsTarget: vi.fn(),
  openSettingsPage: vi.fn(),
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
vi.mock('../../../../shared/product-branding', async (importOriginal) => ({
  ...(await importOriginal<typeof ProductBranding>()),
  isForflowBuild: () => true
}))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))
vi.mock('@/lib/resolved-worktree-execution-host', () => ({
  getResolvedExecutionHostIdForWorktree: mocks.resolveHost
}))
vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))

function fixture(overrides: Partial<TerminalPaneController> = {}): TerminalPaneController {
  const value = {
    tabId: 'terminal-1',
    worktreeId: 'workspace-1',
    activePane: { id: 1, leafId: 'leaf-1' },
    activePaneCanToggleChat: true,
    activePaneCanContinueInNewSession: true,
    contextMenu: {
      runForPane: vi.fn((_id: number, action: () => void) => action()),
      onContinueAgentSessionInNewSession: vi.fn(),
      onForkAgentSession: vi.fn()
    },
    activePaneIsChatLeaf: false,
    effectiveChatViewMode: false,
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
  mocks.resolveHost.mockReturnValue('local')
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

  it('opens an existing terminal conversation without changing defaults for new agents', () => {
    const controller = fixture({ activePaneCanToggleChat: false })
    render(<ForflowSessionToolbar controller={controller} />)
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }))
    expect(controller.handleToggleNativeChat).toHaveBeenCalledOnce()
    expect(mocks.updateSettingsOrThrow).not.toHaveBeenCalled()
  })

  it.each(['hidden', 'missing-pane', 'agent-exited'] as const)(
    'keeps an unavailable target unchanged: %s',
    (reason) => {
      const controller = fixture({
        isActive: reason !== 'hidden',
        activePane: reason === 'missing-pane' ? null : fixture().activePane,
        activePaneCanToggleChat: reason !== 'agent-exited',
        isChatEligibleForLeaf: () => reason !== 'agent-exited'
      })
      render(<ForflowSessionToolbar controller={controller} />)
      fireEvent.click(screen.getByRole('button', { name: 'Chat' }))
      expect(controller.handleToggleNativeChat).not.toHaveBeenCalled()
      expect(mocks.updateSettingsOrThrow).not.toHaveBeenCalled()
    }
  )

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

  it('opens files and changes through the existing workspace actions', () => {
    render(<ForflowSessionToolbar controller={fixture()} />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'View outputs' }), {
      button: 0,
      ctrlKey: false
    })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Files' }))
    expect(mocks.showRightSidebarFiles).toHaveBeenCalledOnce()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'View outputs' }), {
      button: 0,
      ctrlKey: false
    })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Review changes' }))
    expect(mocks.setRightSidebarTab).toHaveBeenCalledExactlyOnceWith('source-control')
    expect(mocks.setRightSidebarOpen).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('keeps files available without offering Git review for a folder project', () => {
    mocks.repos[0].kind = 'folder'
    render(<ForflowSessionToolbar controller={fixture()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Review results' }))
    expect(mocks.openModal).toHaveBeenCalledWith('forflow-review', {
      initialReviewTarget: { hostId: 'local', selector: 'id:workspace-1' }
    })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'View outputs' }), {
      button: 0,
      ctrlKey: false
    })
    expect(screen.queryByRole('menuitem', { name: 'Review changes' })).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Files' })).toBeTruthy()
  })
})

it.each(['Hand Off to Another Agent', 'Fork Agent Session…'])(
  'routes %s through the existing action for the active pane',
  (action) => {
    const controller = fixture()
    render(<ForflowSessionToolbar controller={controller} />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Agent collaboration' }), {
      button: 0,
      ctrlKey: false
    })
    fireEvent.click(screen.getByRole('menuitem', { name: action }))
    expect(controller.contextMenu.runForPane).toHaveBeenCalledWith(1, expect.any(Function))
    expect(
      action === 'Hand Off to Another Agent'
        ? controller.contextMenu.onContinueAgentSessionInNewSession
        : controller.contextMenu.onForkAgentSession
    ).toHaveBeenCalledOnce()
    expect(mocks.openModal).not.toHaveBeenCalled()
  }
)

it('keeps folder continuation available without offering a Git worktree fork', () => {
  mocks.repos[0].kind = 'folder'
  render(<ForflowSessionToolbar controller={fixture()} />)
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Agent collaboration' }), {
    button: 0,
    ctrlKey: false
  })
  expect(screen.getByRole('menuitem', { name: 'Hand Off to Another Agent' })).toBeTruthy()
  expect(screen.queryByRole('menuitem', { name: 'Fork Agent Session…' })).toBeNull()
})

it.each(['missing-pane', 'hidden'])('does not offer source actions for a %s session', (reason) => {
  render(
    <ForflowSessionToolbar
      controller={fixture(reason === 'missing-pane' ? { activePane: null } : { isActive: false })}
    />
  )
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Agent collaboration' }), {
    button: 0,
    ctrlKey: false
  })
  expect(screen.queryByRole('menuitem', { name: 'Hand Off to Another Agent' })).toBeNull()
  expect(screen.queryByRole('menuitem', { name: 'Fork Agent Session…' })).toBeNull()
})

it('opens the existing orchestration page without preparing an unrelated task', () => {
  render(<ForflowSessionToolbar controller={fixture()} />)
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Agent collaboration' }), {
    button: 0,
    ctrlKey: false
  })
  fireEvent.click(screen.getByRole('menuitem', { name: 'Orchestration & examples' }))
  expect(mocks.openSettingsTarget).toHaveBeenCalledWith({ pane: 'orchestration', repoId: null })
  expect(mocks.openSettingsPage).toHaveBeenCalledOnce()
  expect(mocks.setSettingsSearchQuery).toHaveBeenCalledWith('')
  expect(mocks.openModal).not.toHaveBeenCalled()
})

it.each([
  ['folder:notes', 'local', 'folder:notes'],
  ['workspace-1', 'ssh:remote', 'id:workspace-1'],
  ['workspace-1', null, undefined]
])(
  'opens material review with the existing host and workspace identity',
  (worktreeId, host, selector) => {
    mocks.resolveHost.mockReturnValue(host ?? null)
    render(<ForflowSessionToolbar controller={fixture({ worktreeId: worktreeId ?? '' })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Review results' }))
    expect(mocks.openModal).toHaveBeenCalledWith('forflow-review', {
      initialReviewTarget: host ? { hostId: host, selector } : undefined
    })
  }
)

it('keeps review and files available for structured chat with its workspace owner', () => {
  render(<ForflowWorkspaceToolbar worktreeId="workspace-1" />)
  fireEvent.click(screen.getByRole('button', { name: 'Review results' }))
  expect(mocks.openModal).toHaveBeenCalledExactlyOnceWith('forflow-review', {
    initialReviewTarget: { hostId: 'local', selector: 'id:workspace-1' }
  })
  fireEvent.pointerDown(screen.getByRole('button', { name: 'View outputs' }), {
    button: 0,
    ctrlKey: false
  })
  fireEvent.click(screen.getByRole('menuitem', { name: 'Files' }))
  expect(mocks.showRightSidebarFiles).toHaveBeenCalledOnce()
})

it('does not offer structured workspace actions until the workspace is known', () => {
  render(<ForflowWorkspaceToolbar />)
  expect(screen.queryByRole('button', { name: 'Review results' })).toBeNull()
  expect(mocks.openModal).not.toHaveBeenCalled()
})
