import { useRef, useState } from 'react'
import { Search } from 'lucide-react'
import type { CodexReview } from '../../../../shared/codex-review-types'
import type { AiVaultSearchHit } from '../../../../shared/ai-vault-search-types'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../shared/execution-host'
import { useMountedRef } from '@/hooks/useMountedRef'
import { isWebClientLocation } from '@/lib/web-client-location'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { AiVaultPanelSearch } from '../right-sidebar/AiVaultPanelSearch'
import { AiVaultSearchEvidence } from '../right-sidebar/AiVaultSearchEvidence'
import { useAiVaultPanelSearch } from '../right-sidebar/use-ai-vault-search'
import { codexTranscriptSearchCopy } from './codex-transcript-search-copy'
import { reviewCopy } from './review-copy'

const CODEX_AGENTS = ['codex'] as const

function canReview(hit: AiVaultSearchHit): boolean {
  return (
    hit.agent === 'codex' &&
    (!hit.executionHostId || hit.executionHostId === LOCAL_EXECUTION_HOST_ID) &&
    hit.source.presence === 'present' &&
    Boolean(hit.source.filePath)
  )
}

function SearchResults({
  query,
  onOpenReview
}: {
  query: string
  onOpenReview: (review: CodexReview) => void
}): React.JSX.Element {
  const c = codexTranscriptSearchCopy()
  const r = reviewCopy()
  const search = useAiVaultPanelSearch(query, CODEX_AGENTS, undefined, LOCAL_EXECUTION_HOST_ID)
  const [opening, setOpening] = useState<string | null>(null)
  const [error, setError] = useState<{ key: string; message: string } | null>(null)
  const busy = useRef(false)
  const mounted = useMountedRef()
  const key = JSON.stringify([search.resetKey, search.needsLocalConsent])
  const currentKey = useRef(key)
  currentKey.current = key

  async function open(hit: AiVaultSearchHit): Promise<void> {
    if (busy.current || !search.searching || !canReview(hit)) {
      return
    }
    busy.current = true
    setOpening(hit.sessionId)
    setError(null)
    try {
      const openReview = window.api?.codexUsage?.openReview
      if (!openReview) {
        throw new Error(r.unavailable)
      }
      const review = await openReview({
        sessionId: hit.sessionId,
        scope: 'all',
        range: 'all',
        focus: r.defaultFocus,
        expectedSourcePath: hit.source.filePath
      })
      if (mounted.current && currentKey.current === key) {
        onOpenReview(review)
      }
    } catch (reason) {
      if (mounted.current && currentKey.current === key) {
        setError({ key, message: reason instanceof Error ? reason.message : r.error })
      }
    } finally {
      busy.current = false
      if (mounted.current) {
        setOpening(null)
      }
    }
  }

  return (
    <div className="scrollbar-sleek min-h-0 space-y-3 overflow-y-auto">
      {!search.hasQuery && <p className="text-sm text-muted-foreground">{c.empty}</p>}
      {search.loading && (
        <p role="status" className="text-sm text-muted-foreground">
          {r.loading}
        </p>
      )}
      {error?.key === key && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
      <AiVaultPanelSearch search={search} noAgents={false} surface="content">
        <ul className="divide-y divide-border">
          {search.hits.map((hit) => (
            <li
              key={`${hit.executionHostId ?? 'local'}:${hit.agent}:${hit.sessionId}:${hit.source.filePath ?? ''}`}
              className="space-y-2 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{hit.title || hit.sessionId}</p>
                  {hit.cwd && <p className="break-all text-xs text-muted-foreground">{hit.cwd}</p>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={opening !== null || !canReview(hit)}
                  onClick={() => void open(hit)}
                >
                  {opening === hit.sessionId ? r.loading : r.open}
                </Button>
              </div>
              <AiVaultSearchEvidence hit={hit} surface="content" />
              {!canReview(hit) && <p className="text-xs text-muted-foreground">{c.unavailable}</p>}
            </li>
          ))}
        </ul>
      </AiVaultPanelSearch>
    </div>
  )
}

export function CodexTranscriptSearch({
  active,
  onOpenReview
}: {
  active: boolean
  onOpenReview: (review: CodexReview) => void
}): React.JSX.Element | null {
  const c = codexTranscriptSearchCopy()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  if (isWebClientLocation()) {
    return null
  }
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Search />
        {c.title}
      </Button>
      <Dialog open={open && active} onOpenChange={setOpen}>
        {open && active && (
          <DialogContent className="max-h-[80vh] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{c.title}</DialogTitle>
              <DialogDescription>{c.description}</DialogDescription>
            </DialogHeader>
            <Input
              aria-label={c.placeholder}
              placeholder={c.placeholder}
              value={query}
              maxLength={200}
              onChange={(event) => setQuery(event.target.value)}
            />
            <SearchResults
              query={query}
              onOpenReview={(review) => {
                setOpen(false)
                onOpenReview(review)
              }}
            />
            <p className="text-xs text-muted-foreground">{c.sourceNote}</p>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
