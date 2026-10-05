import { useEffect, useState, type JSX } from 'react'
import { Search } from 'lucide-react'
import { AI_VAULT_AGENT_LABELS } from '../../../../shared/ai-vault-types'
import { usePrefersReducedMotion } from '@/components/feature-wall/feature-wall-modal-helpers'
import { AgentSessionHistoryIcon } from '@/components/right-sidebar/agent-session-history-icon'
import { highlightedSearchSnippet } from '@/components/right-sidebar/AiVaultSearchEvidence'
import { AgentIcon } from '@/lib/agent-catalog'
import { translate } from '@/i18n/i18n'
import {
  getSessionSearchDemoRecentRows,
  getSessionSearchDemoScenes,
  type SessionSearchDemoRow
} from './session-search-feature-tip-demo'

type DemoPhase = 'idle' | 'typing' | 'searching' | 'results' | 'focused'
type DemoState = { scene: number; phase: DemoPhase; chars: number }

// Typing advances one character per step.
const PHASE_MS: Record<DemoPhase, number> = {
  idle: 1100,
  typing: 65,
  searching: 550,
  results: 1300,
  focused: 0
}
const ROW_STAGGER_MS = 90

function nextDemoState(state: DemoState, queryLength: number): DemoState {
  switch (state.phase) {
    case 'idle':
      return { ...state, phase: 'typing', chars: 0 }
    case 'typing':
      return state.chars < queryLength
        ? { ...state, chars: state.chars + 1 }
        : { ...state, phase: 'searching' }
    case 'searching':
      return { ...state, phase: 'results' }
    case 'results':
      return { ...state, phase: 'focused' }
    case 'focused':
      return state
  }
}

function DemoSessionRow({
  row,
  isHit,
  focused,
  index
}: {
  row: SessionSearchDemoRow
  isHit: boolean
  focused: boolean
  index: number
}): JSX.Element {
  return (
    <div
      data-focused={focused}
      className="flex flex-col border-b border-sidebar-border px-4 py-3 last:border-b-0 transition-colors duration-300 animate-in fade-in-0 slide-in-from-bottom-1 [animation-fill-mode:both] data-[focused=true]:bg-sidebar-accent motion-reduce:animate-none"
      style={{ animationDelay: `${index * ROW_STAGGER_MS}ms` }}
    >
      <div className="text-[13px] font-medium leading-5 text-foreground">{row.title}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">
        <span className="font-medium text-foreground/80">{row.role}</span>
        <span>: {isHit ? highlightedSearchSnippet(row.text) : row.text}</span>
      </div>
      <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted-foreground">
        <AgentIcon agent={row.agent} size={14} />
        <span className="truncate">{AI_VAULT_AGENT_LABELS[row.agent]}</span>
        <span className="shrink-0 tabular-nums">
          {translate(
            'auto.components.right.sidebar.AiVaultSessionRow.messageCount',
            '{{value0}} msgs',
            { value0: row.messages }
          )}
        </span>
        <span className="shrink-0 text-muted-foreground/55">·</span>
        <span className="shrink-0">{row.age}</span>
      </div>
    </div>
  )
}

export function SessionSearchFeatureTipVisual(): JSX.Element {
  const reducedMotion = usePrefersReducedMotion()
  const scenes = getSessionSearchDemoScenes()
  const recentRows = getSessionSearchDemoRecentRows()
  const [state, setState] = useState<DemoState>({ scene: 0, phase: 'idle', chars: 0 })
  // Keep the completed search visible so readers can inspect the matches.
  const shown: DemoState = reducedMotion
    ? { scene: 0, phase: 'focused', chars: scenes[0].query.length }
    : state
  const scene = scenes[shown.scene]
  const queryLength = scene.query.length

  useEffect(() => {
    if (reducedMotion || state.phase === 'focused') {
      return
    }
    const timeoutId = window.setTimeout(
      () => setState((current) => nextDemoState(current, queryLength)),
      // Why: a beat after the last keystroke before the search starts.
      state.phase === 'typing' && state.chars === queryLength
        ? PHASE_MS.typing * 2
        : PHASE_MS[state.phase]
    )
    return () => window.clearTimeout(timeoutId)
  }, [queryLength, reducedMotion, state])

  const showingHits = shown.phase === 'results' || shown.phase === 'focused'
  const rows = (showingHits ? scene.hits : recentRows).slice(0, 2)
  const dimmed = shown.phase === 'typing' || shown.phase === 'searching'

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center px-6 py-10"
      aria-hidden="true"
    >
      <div
        inert
        className="relative w-full max-w-[22rem] overflow-hidden rounded-xl border border-border bg-sidebar text-left shadow-xs"
      >
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-3 text-[13px] font-medium">
          <AgentSessionHistoryIcon size={16} />
          {translate(
            'auto.components.right.sidebar.AiVaultPanel.sessionHistory',
            'Agent Session History'
          )}
        </div>
        <div className="border-b border-sidebar-border p-3">
          <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {shown.chars > 0
                ? scene.query.slice(0, shown.chars)
                : translate(
                    'auto.components.right.sidebar.AiVaultPanel.searchSessions',
                    'Search sessions'
                  )}
            </span>
          </div>
        </div>
        <div
          data-dimmed={dimmed}
          className="transition-opacity duration-200 data-[dimmed=true]:opacity-50"
        >
          {rows.map((row, index) => (
            <DemoSessionRow
              key={row.title}
              row={row}
              isHit={showingHits}
              focused={shown.phase === 'focused' && index === 0}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
