import { useEffect, useState, type JSX } from 'react'
import { AgentsOrchestrationVisual } from '@/components/feature-wall/AgentsOrchestrationVisual'
import {
  ORCHESTRATION_CLI_COMMAND_LOOP_MS,
  ORCHESTRATION_CLI_COMMAND_TIMINGS_MS
} from '@/components/feature-wall/agents-orchestration/orchestration-types'
import { usePrefersReducedMotion } from '@/components/feature-wall/feature-wall-modal-helpers'
import { translate } from '@/i18n/i18n'
import { isForflowBuild } from '../../../../shared/product-branding'
import { cn } from '@/lib/utils'

const command = isForflowBuild() ? 'forflow' : 'orca'
const CLI_AGENT_COMMANDS = [
  `${command} worktree create --name auth-pr-1`,
  `${command} worktree create --name auth-pr-2`,
  `${command} orchestration dispatch --task pr1 --to w1`,
  `${command} orchestration dispatch --task pr2 --to w2`
]

export function CliFeatureTipVisual(): JSX.Element {
  const reducedMotion = usePrefersReducedMotion()
  const [animatedVisibleCommandCount, setAnimatedVisibleCommandCount] = useState(0)
  // Why: reduced-motion users should see the static completed state without a
  // post-render state repair; only the animated path needs timer-backed state.
  const visibleCommandCount = reducedMotion
    ? CLI_AGENT_COMMANDS.length
    : animatedVisibleCommandCount

  useEffect(() => {
    if (reducedMotion) {
      return
    }

    let cancelled = false
    const timeouts: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timeouts.push(window.setTimeout(() => !cancelled && fn(), ms))
    }

    // Why: terminal lines mirror the orchestration tour beat timings so the
    // shell shows each command as the parent agent runs it.
    const runOnce = (): void => {
      setAnimatedVisibleCommandCount(0)
      ORCHESTRATION_CLI_COMMAND_TIMINGS_MS.forEach((ms, index) => {
        later(() => setAnimatedVisibleCommandCount(index + 1), ms)
      })
      later(runOnce, ORCHESTRATION_CLI_COMMAND_LOOP_MS)
    }

    runOnce()
    return () => {
      cancelled = true
      timeouts.forEach((id) => window.clearTimeout(id))
    }
  }, [reducedMotion])

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center px-6 py-6"
      aria-hidden="true"
    >
      <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="space-y-1.5 px-3 py-3 font-mono text-[11px] leading-4 text-foreground">
          <div className="truncate text-muted-foreground">
            <span className="mr-1.5 text-foreground">●</span>
            {translate(
              'auto.components.feature.tips.CliFeatureTipVisual.22e62f3bab',
              'Claude Code session started'
            )}
          </div>
          {CLI_AGENT_COMMANDS.map((command, index) => {
            const isVisible = index < visibleCommandCount
            const isCurrentLine = isVisible && index === visibleCommandCount - 1
            return (
              <div
                key={command}
                className={cn(
                  'break-words',
                  isVisible ? 'animate-cli-tip-command-line' : 'invisible'
                )}
              >
                <span className="text-foreground">
                  {translate('auto.components.feature.tips.CliFeatureTipVisual.badb4fc342', '>')}
                </span>
                <span>{command}</span>
                {isCurrentLine ? (
                  <span className="animate-cli-tip-caret ml-0.5 inline-block h-3 w-1 translate-y-0.5 rounded-sm bg-foreground/70" />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="cli-tip-orchestration-frame relative mt-3 flex h-56 w-full max-w-[22rem] items-center justify-center">
        <div className="origin-center">
          <AgentsOrchestrationVisual
            activeStepId="orchestration"
            reducedMotion={reducedMotion}
            widthPx={350}
            heightPx={224}
            orchestrationCreatedChildCount={Math.min(visibleCommandCount, 2)}
            orchestrationLoopMs={ORCHESTRATION_CLI_COMMAND_LOOP_MS}
            orchestrationShowResponseBeats={false}
          />
        </div>
      </div>
    </div>
  )
}
