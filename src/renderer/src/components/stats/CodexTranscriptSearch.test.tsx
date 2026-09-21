// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CodexReview } from '../../../../shared/codex-review-types'
import { searchHit, searchResults } from '../../../../shared/ai-vault-search-test-fixture'
import { CodexTranscriptSearch } from './CodexTranscriptSearch'

const mocks = vi.hoisted(() => ({
  settings: { aiVaultSearch: { enabled: true, historyDays: null } },
  web: false,
  search: vi.fn(),
  save: vi.fn(),
  open: vi.fn()
}))
vi.mock('@/store', () => ({
  useAppStore: Object.assign((selector: (state: typeof mocks) => unknown) => selector(mocks), {
    getState: () => ({ settings: mocks.settings, updateSettingsOrThrow: mocks.save })
  })
}))
vi.mock('@/lib/web-client-location', () => ({ isWebClientLocation: () => mocks.web }))

const review: CodexReview = {
  id: 'review',
  sessionId: 'host-session',
  scope: 'all',
  range: 'all',
  revision: 0,
  versions: [],
  issues: [],
  comments: [],
  confirmations: []
}

beforeEach(() => {
  mocks.web = false
  mocks.settings.aiVaultSearch.enabled = true
  mocks.search.mockReset().mockResolvedValue(searchResults())
  mocks.open.mockReset().mockResolvedValue(review)
  mocks.save.mockReset().mockImplementation(async () => {
    mocks.settings.aiVaultSearch.enabled = true
  })
  vi.stubGlobal('api', {
    aiVault: { searchSessions: mocks.search },
    codexUsage: { openReview: mocks.open }
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function show(onOpenReview = vi.fn()) {
  const view = render(<CodexTranscriptSearch active onOpenReview={onOpenReview} />)
  fireEvent.click(screen.getByRole('button', { name: 'Search session content' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'needle' } })
  return { view, onOpenReview }
}

describe('local transcript search to review', () => {
  it('waits for explicit index consent and uses the existing enable action', async () => {
    mocks.settings.aiVaultSearch.enabled = false
    const { view, onOpenReview } = show()
    expect(mocks.search).not.toHaveBeenCalled()
    expect(screen.getByText(/Content is not redacted/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }))
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        aiVaultSearch: { enabled: true, historyDays: null }
      })
    )
    view.rerender(<CodexTranscriptSearch active onOpenReview={onOpenReview} />)
    expect(await screen.findByText('Indexed conversation')).toBeVisible()
  })

  it('searches only local Codex, shows evidence and opens a source-checked all-history review', async () => {
    const { onOpenReview } = show()
    expect(await screen.findByText('Indexed conversation')).toBeVisible()
    expect(screen.getByText('needle', { selector: 'mark' })).toBeVisible()
    expect(mocks.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'needle', filters: { agents: ['codex'] } }),
      'local'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open review' }))
    await waitFor(() => expect(onOpenReview).toHaveBeenCalledWith(review))
    expect(mocks.open).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'host-session',
        scope: 'all',
        range: 'all',
        expectedSourcePath: '/host/transcript.jsonl'
      })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Search session content' }))
    expect(screen.getByRole('textbox')).toHaveValue('needle')
  })

  it.each(['remote', 'missing', 'unverifiable', 'other-agent', 'no-path'])(
    'does not review a %s result',
    async (kind) => {
      const hit = searchHit()
      if (kind === 'remote') {
        hit.executionHostId = 'ssh:another-computer'
      }
      if (kind === 'missing') {
        hit.source.presence = 'missing'
      }
      if (kind === 'unverifiable') {
        hit.source.presence = 'unverifiable'
      }
      if (kind === 'other-agent') {
        hit.agent = 'claude'
      }
      if (kind === 'no-path') {
        delete hit.source.filePath
      }
      mocks.search.mockResolvedValue({ ...searchResults(), hits: [hit] })
      show()
      expect(await screen.findByText('Indexed conversation')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Open review' })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: 'Open review' }))
      expect(mocks.open).not.toHaveBeenCalled()
    }
  )

  it('keeps a source mismatch visible and stays out of Review', async () => {
    mocks.open.mockRejectedValue(new Error('Search source changed'))
    const { onOpenReview } = show()
    await screen.findByText('Indexed conversation')
    fireEvent.click(screen.getByRole('button', { name: 'Open review' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Search source changed')
    expect(onOpenReview).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it.each(['close', 'query', 'inactive'])(
    'ignores an opening response after %s',
    async (change) => {
      const pending = Promise.withResolvers<CodexReview>()
      mocks.open.mockReturnValue(pending.promise)
      const { view, onOpenReview } = show()
      await screen.findByText('Indexed conversation')
      fireEvent.click(screen.getByRole('button', { name: 'Open review' }))
      if (change === 'close') {
        fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      }
      if (change === 'query') {
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'another query' } })
      }
      if (change === 'inactive') {
        view.rerender(<CodexTranscriptSearch active={false} onOpenReview={onOpenReview} />)
      }
      await act(async () => pending.resolve(review))
      expect(onOpenReview).not.toHaveBeenCalled()
    }
  )

  it('loads another page through the existing index cursor', async () => {
    mocks.search.mockResolvedValueOnce({
      ...searchResults(),
      page: { cursor: 'next-page', hasMore: true }
    })
    mocks.search.mockResolvedValueOnce({
      ...searchResults(),
      hits: [{ ...searchHit(), sessionId: 'second', title: 'Second conversation' }]
    })
    show()
    await screen.findByText('Indexed conversation')
    fireEvent.click(screen.getByRole('button', { name: 'Load more matches' }))
    expect(await screen.findByText('Second conversation')).toBeVisible()
    expect(screen.getByText('Indexed conversation')).toBeVisible()
    expect(mocks.search).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'next-page' }),
      'local'
    )
  })

  it('never exposes local Review search in a web client', () => {
    mocks.web = true
    render(<CodexTranscriptSearch active onOpenReview={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(mocks.search).not.toHaveBeenCalled()
  })
})
