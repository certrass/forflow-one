import { translate } from '@/i18n/i18n'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import type { SkillUsageExample } from './skill-usage-example'

export const getOrchestrationUsageExamples = createLocalizedCatalog((): SkillUsageExample[] => [
  {
    id: 'handoff',
    title: translate('auto.lib.orchestration.usage.examples.5e0d489fe1', 'Hand off an active task'),
    summary: translate(
      'auto.lib.orchestration.usage.examples.handoffSummary',
      'Move ownership to another agent with enough context to continue.'
    ),
    prompt: translate(
      'forflow.orchestrationPrompts.handoff',
      'Use /orchestration to hand off the current task to a suitable idle agent. Include the goal, current progress, relevant files, constraints, and what to finish next.'
    )
  },
  {
    id: 'worktree-handoff',
    title: translate(
      'auto.lib.orchestration.usage.examples.ab0e9803b7',
      'Hand off to another worktree'
    ),
    summary: translate(
      'auto.lib.orchestration.usage.examples.worktreeHandoffSummary',
      'Move work to an agent that is already running in a different branch.'
    ),
    prompt: translate(
      'forflow.orchestrationPrompts.worktree',
      'Use /orchestration to hand off the current task to an agent in another worktree. Confirm the destination, then send the goal, progress, relevant files, and expected result.'
    )
  },
  {
    id: 'child-sequence',
    title: translate('auto.lib.orchestration.usage.examples.bddc4c09b8', 'Run a phased workflow'),
    summary: translate(
      'auto.lib.orchestration.usage.examples.childSequenceSummary',
      'Use child agents one after another when each phase depends on the last.'
    ),
    prompt: translate(
      'forflow.orchestrationPrompts.sequence',
      'Use /orchestration to break the current task into dependent phases. Give each child agent the requirements and the previous phase’s results, and start the next phase after the current one finishes.'
    )
  },
  {
    id: 'child-parallel',
    title: translate(
      'auto.lib.orchestration.usage.examples.9e37a5b1b3',
      'Run independent work in parallel'
    ),
    summary: translate(
      'auto.lib.orchestration.usage.examples.childParallelSummary',
      'Split non-overlapping investigation or implementation tasks across child agents.'
    ),
    prompt: translate(
      'forflow.orchestrationPrompts.parallel',
      'Use /orchestration to split the current task into independent parts and run them in parallel. Give each agent the relevant context, a clear scope, and completion criteria. Collect the results and check them against the original requirements.'
    )
  },
  {
    id: 'child-worktrees',
    title: translate(
      'auto.lib.orchestration.usage.examples.f91fe27f2a',
      'Split a large change into smaller PRs'
    ),
    summary: translate(
      'auto.lib.orchestration.usage.examples.prSplitSummary',
      'Give each child agent its own worktree so parallel implementation stays reviewable.'
    ),
    prompt: translate(
      'forflow.orchestrationPrompts.worktrees',
      'Use /orchestration to split the current change into smaller reviewable PRs, each in its own child worktree. Define the scope, shared requirements, and dependencies before starting the agents.'
    )
  }
])
