import { useEffect, useState, type JSX } from 'react'
import { Check, Mic, Square } from 'lucide-react'
import { ShortcutKeyCombo } from '@/components/ShortcutKeyCombo'
import { usePrefersReducedMotion } from '@/components/feature-wall/feature-wall-modal-helpers'
import { useShortcutKeyDetails } from '@/hooks/useShortcutLabel'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

const TYPE_START_DELAY_MS = 650
const TYPE_INTERVAL_MS = 36
const WAVEFORM_BAR_HEIGHTS = [38, 70, 100, 58, 82]

export function VoiceDictationFeatureTipVisual(): JSX.Element {
  const reducedMotion = usePrefersReducedMotion()
  const shortcut = useShortcutKeyDetails('voice.dictation')
  const dictatedPrompt = translate(
    'featureTips.voice.demoPrompt',
    'Review this diff for edge cases and add tests for anything you find.'
  )
  const [typedLength, setTypedLength] = useState(0)
  const effectiveTypedLength = reducedMotion ? dictatedPrompt.length : typedLength
  const typing = !reducedMotion && effectiveTypedLength < dictatedPrompt.length

  useEffect(() => {
    if (reducedMotion) {
      return
    }

    let cancelled = false
    let timeoutId: number | undefined
    let nextLength = 0
    const typeNext = (): void => {
      if (cancelled) {
        return
      }
      nextLength += 1
      setTypedLength(nextLength)
      if (nextLength < dictatedPrompt.length) {
        timeoutId = window.setTimeout(typeNext, TYPE_INTERVAL_MS)
      }
    }

    timeoutId = window.setTimeout(typeNext, TYPE_START_DELAY_MS)
    return () => {
      cancelled = true
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [dictatedPrompt, reducedMotion])

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center px-6 py-10"
      aria-hidden="true"
    >
      {shortcut.keys.length > 0 ? (
        <div className="flex items-center gap-2.5">
          <ShortcutKeyCombo keys={shortcut.keys} doubleTap={shortcut.doubleTap} />
          <span className="text-xs text-muted-foreground">
            {translate('featureTips.voice.startDictation', 'Start dictation')}
          </span>
        </div>
      ) : null}

      <div className="relative mt-4 w-full max-w-[22rem] overflow-hidden rounded-xl border border-border bg-card text-left shadow-xs">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-[13px] font-medium">
          <Mic className="size-4 text-muted-foreground" />
          <span>{translate('featureTips.voice.agentPromptTitle', 'Agent prompt')}</span>
        </div>

        <div className="min-h-36 px-4 py-5 text-sm leading-relaxed">
          <div className="flex min-w-0 gap-2.5">
            <span className="shrink-0 text-muted-foreground">›</span>
            <span
              data-testid="dictated-prompt"
              className="min-w-0 flex-1 whitespace-pre-wrap break-words text-foreground"
            >
              {dictatedPrompt.slice(0, effectiveTypedLength)}
              {typing ? (
                <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 bg-foreground/75" />
              ) : null}
            </span>
          </div>
        </div>

        <div className="flex h-12 items-center gap-2 border-t border-border bg-muted/50 px-4 text-xs text-muted-foreground">
          {typing ? (
            <Mic className="size-4 shrink-0" />
          ) : (
            <Check className="size-4 shrink-0 text-status-success" />
          )}
          <span
            data-recording={typing}
            className="hidden h-4 items-center gap-0.5 data-[recording=true]:flex"
            aria-hidden="true"
          >
            {WAVEFORM_BAR_HEIGHTS.map((height, index) => (
              <span
                key={height}
                className={cn('block w-0.5 rounded-full bg-current', typing && 'animate-waveform')}
                style={{ height: `${height}%`, animationDelay: `${index * 0.1}s` }}
              />
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {typing
              ? translate('featureTips.voice.listening', 'Listening...')
              : translate('featureTips.voice.transcribed', 'Ready to edit')}
          </span>
          {typing ? <Square className="size-2.5 shrink-0 fill-current" /> : null}
        </div>
      </div>
    </div>
  )
}
