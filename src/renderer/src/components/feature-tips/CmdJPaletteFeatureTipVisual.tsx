import { useEffect, useState, type JSX } from 'react'
import { Plus, Search } from 'lucide-react'
import { usePrefersReducedMotion } from '@/components/feature-wall/feature-wall-modal-helpers'
import { formatShortcutKeyComboDetails, useShortcutKeyDetails } from '@/hooks/useShortcutLabel'
import { translate } from '@/i18n/i18n'
import { ShortcutKeyCombo } from '@/components/ShortcutKeyCombo'
import { cn } from '@/lib/utils'

const TYPED_QUERY = 'auth'
// Why: the real palette lists recent worktrees on open; typing only narrows the
// list. Mix done + running states so the tip reads like a live worktree switcher.
const DEMO_WORKTREES: readonly {
  key: string
  name: string
  branch: string
  status: 'done' | 'running'
}[] = [
  { key: '1', name: 'payments-api', branch: 'feat/payments-api', status: 'done' },
  { key: '2', name: 'auth-redirect', branch: 'fix/auth-redirect', status: 'done' },
  { key: '3', name: 'oauth-callback', branch: 'fix/oauth-callback', status: 'running' },
  { key: '4', name: 'docs-site', branch: 'main', status: 'done' }
]

function filterDemoWorktrees(query: string): typeof DEMO_WORKTREES {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return DEMO_WORKTREES
  }
  return DEMO_WORKTREES.filter(
    (worktree) =>
      worktree.name.toLowerCase().includes(normalized) ||
      worktree.branch.toLowerCase().includes(normalized)
  )
}

// Why: cycle phases are sequenced so the keypress visibly precedes the palette
// opening (cause → effect), matching what the user will see when they actually
// press the shortcut.
type CyclePhase = 'idle' | 'pressed' | 'open' | 'typing'

const KEYPRESS_AT_MS = 450
const PALETTE_OPEN_AT_MS = 850
// Why: linger on the empty-query worktree list so users notice the palette
// already shows recent worktrees before filtering kicks in.
const HOLD_BEFORE_TYPING_MS = 700
// Per-character typing interval. Kept tight and constant so the cursor advances
// at an even cadence instead of feeling staggered.
const TYPE_INTERVAL_MS = 120

export function CmdJPaletteFeatureTipVisual(): JSX.Element {
  const reducedMotion = usePrefersReducedMotion()
  // Why: render the live binding so the cue stays correct after a rebind and on
  // platforms where Cmd+J is not the default (Linux/Windows use Ctrl+Shift+J).
  const shortcut = useShortcutKeyDetails('worktree.palette')
  // Why: the press animation staggers per-key chips (⌘ then J); fall back to the
  // platform default when the user disables the binding.
  const displayShortcut =
    shortcut.keys.length > 0 ? shortcut : formatShortcutKeyComboDetails('worktree.palette')[0]
  const displayShortcutKeys = displayShortcut?.keys ?? []
  const displayShortcutDoubleTap = displayShortcut?.doubleTap === true

  const [phase, setPhase] = useState<CyclePhase>('idle')
  const [typedLength, setTypedLength] = useState(0)

  // Why: for reduced-motion users, jump straight to the fully-populated end
  // state so they see what the feature does without any animation.
  const isPressed = !reducedMotion && phase === 'pressed'
  const effectiveTypedLength = reducedMotion ? TYPED_QUERY.length : typedLength
  const currentQuery = TYPED_QUERY.slice(0, effectiveTypedLength)
  const visibleWorktrees = filterDemoWorktrees(currentQuery)
  const showCreateAction = currentQuery.trim().length > 0
  const renderQuery = currentQuery
  const renderWorktrees = visibleWorktrees
  const renderShowCreate = showCreateAction
  // Why: mirror WorktreeJumpPalette — recent worktrees render as soon as the
  // palette opens; typing only filters them down.
  const showWorktreeList = reducedMotion || phase === 'open' || phase === 'typing'
  // Why: keep the palette hidden during `pressed` so the keypress visibly
  // precedes the palette opening.
  const paletteMounted = reducedMotion || phase === 'open' || phase === 'typing'
  const paletteOpaque = reducedMotion || paletteMounted
  const resultEnterClass =
    showWorktreeList && !reducedMotion && phase === 'open' ? 'animate-cmd-j-tip-result-in' : ''

  useEffect(() => {
    if (reducedMotion) {
      return
    }

    let cancelled = false
    const timeouts: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timeouts.push(window.setTimeout(() => !cancelled && fn(), ms))
    }

    const startTyping = (startIndex: number): void => {
      let i = startIndex
      const typeNext = (): void => {
        if (cancelled) {
          return
        }
        i += 1
        setTypedLength(i)
        if (i >= TYPED_QUERY.length) {
          return
        }
        timeouts.push(window.setTimeout(typeNext, TYPE_INTERVAL_MS))
      }
      if (i >= TYPED_QUERY.length) {
        return
      }
      later(typeNext, TYPE_INTERVAL_MS)
    }

    // Why: this tip may remain open while Orca is idle. Play the demo once,
    // then settle on the final useful state instead of looping timers forever.
    later(() => setPhase('pressed'), KEYPRESS_AT_MS)
    later(() => setPhase('open'), PALETTE_OPEN_AT_MS)
    later(() => {
      setPhase('typing')
      startTyping(0)
    }, PALETTE_OPEN_AT_MS + HOLD_BEFORE_TYPING_MS)

    setPhase('idle')
    setTypedLength(0)

    return () => {
      cancelled = true
      timeouts.forEach((id) => window.clearTimeout(id))
    }
  }, [reducedMotion])

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center px-6 py-10"
      aria-hidden="true"
    >
      {displayShortcutKeys.length > 0 ? (
        <div
          data-pressed={isPressed}
          className="inline-flex items-center gap-2.5 transition-transform data-[pressed=true]:translate-y-px"
        >
          <ShortcutKeyCombo keys={displayShortcutKeys} doubleTap={displayShortcutDoubleTap} />
          <span className="text-xs text-muted-foreground">
            {translate('featureTips.palette.open', 'Quick switch')}
          </span>
        </div>
      ) : null}

      <div
        data-filtered={currentQuery.length > 0}
        className={cn(
          'relative mt-4 h-72 w-full max-w-[22rem] overflow-hidden rounded-xl border border-border bg-card text-left shadow-xs transition-opacity duration-300 ease-out data-[filtered=true]:h-60',
          !paletteMounted
            ? 'pointer-events-none invisible opacity-0'
            : paletteOpaque
              ? 'opacity-100'
              : 'opacity-0'
        )}
      >
        {/* Why: search and results are absolutely positioned so row content
            changes during the demo never reflow the input bar mid-animation. */}
        <div className="absolute inset-x-0 top-0 flex h-11 items-center gap-2 border-b border-border bg-muted/20 px-3">
          <Search className="size-4 shrink-0 text-muted-foreground/70" />
          <div className="h-5 min-w-0 flex-1 overflow-hidden text-[13px] leading-5 text-foreground/90">
            <span className="block truncate">
              {renderQuery}
              {!reducedMotion && (phase === 'open' || phase === 'typing') ? (
                // Why: this tip can sit open while Orca is idle; keep the
                // caret static so the preview does not wake the compositor.
                <span className="ml-px inline-block h-[14px] w-px -translate-y-px align-middle bg-foreground/75" />
              ) : null}
            </span>
          </div>
        </div>

        {showWorktreeList ? (
          <div className="absolute inset-x-0 top-11 bottom-0 flex flex-col gap-0.5 overflow-hidden p-1.5">
            {renderWorktrees.map((result, index) => (
              <div
                key={result.key}
                role="option"
                aria-selected={currentQuery.length > 0 && index === 0}
                data-selected={currentQuery.length > 0 && index === 0}
                className={cn(
                  'jump-palette-item flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2',
                  resultEnterClass
                )}
              >
                <span className="flex w-4 shrink-0 items-center justify-center">
                  {result.status === 'done' ? (
                    <span className="size-2.5 rounded-full bg-status-success" aria-hidden="true" />
                  ) : (
                    // Why: this tip can stay mounted while Orca is idle; mirror
                    // the sidebar's static working ring instead of spinning.
                    <span className="block size-2.5 rounded-full border border-status-warning bg-status-warning-background" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {result.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {result.branch}
                  </span>
                </div>
              </div>
            ))}
            {renderShowCreate ? (
              <div
                className={cn(
                  'mt-1 flex shrink-0 items-center gap-2.5 border-t border-border px-3 py-3',
                  resultEnterClass
                )}
              >
                <div className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                  <Plus size={13} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                  {translate(
                    'auto.components.feature.tips.CmdJPaletteFeatureTipVisual.ab94e16d44',
                    'Create worktree "{{value0}}"',
                    { value0: renderQuery.trim() }
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
