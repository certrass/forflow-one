import { translate } from '@/i18n/i18n'
import React from 'react'
import { GitFork } from 'lucide-react'
import type { GitHubRepositoryIdentity } from '../../../../shared/github/pull-request-types'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Small muted glyph marking a repo as a fork, with a "Fork of owner/repo"
 * tooltip. Renders nothing when the repo has no resolved upstream.
 */
export function RepoForkIndicator({
  upstream,
  className
}: {
  upstream: GitHubRepositoryIdentity | null | undefined
  className?: string
}): React.JSX.Element | null {
  if (!upstream) {
    return null
  }
  const label = translate('forflow.dynamicCopy.30d47cbb06', 'Fork of {{value0}}/{{value1}}', {
    value0: upstream.owner,
    value1: upstream.repo
  })
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn('inline-flex shrink-0 items-center text-muted-foreground', className)}
          aria-label={label}
        >
          <GitFork className="size-3" aria-hidden="true" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
