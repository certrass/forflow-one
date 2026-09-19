import type {
  ContextualTourStep,
  ContextualTourStepAction
} from '../../../../shared/contextual-tours'
import { translate } from '@/i18n/i18n'

const COPY: Record<string, () => Pick<ContextualTourStep, 'title' | 'body'>> = {
  'board-plan': () => ({
    title: translate('contextualTour.steps.board-plan.title', 'Plan work on the board'),
    body: translate(
      'contextualTour.steps.board-plan.body',
      'Use the board when you want to see workspaces by status instead of by project.'
    )
  }),
  'board-lanes': () => ({
    title: translate('contextualTour.steps.board-lanes.title', 'Move work through lanes'),
    body: translate(
      'contextualTour.steps.board-lanes.body',
      'Drag workspaces between lanes as their status changes.'
    )
  }),
  'session-split': () => ({
    title: translate('contextualTour.steps.session-split.title', 'Split a terminal pane'),
    body: translate(
      'contextualTour.steps.session-split.body',
      'Open a second pane with {terminal.splitRight}, or right-click for split options. Both panes share this workspace’s files.'
    )
  }),
  'session-parallel': () => ({
    title: translate(
      'contextualTour.steps.session-parallel.title',
      'Start another task in parallel'
    ),
    body: translate(
      'contextualTour.steps.session-parallel.body',
      'A Git worktree gives another task its own branch. Ordinary folder workspaces do not isolate file changes.'
    )
  }),
  'browser-context': () => ({
    title: translate('contextualTour.steps.browser-context.title', 'Grab page context for agents'),
    body: translate(
      'contextualTour.steps.browser-context.body',
      "Use the grab tool to copy a page element's context for agents."
    )
  }),
  'browser-annotations': () => ({
    title: translate(
      'contextualTour.steps.browser-annotations.title',
      'Mark design feedback in place'
    ),
    body: translate(
      'contextualTour.steps.browser-annotations.body',
      'Annotate elements and send those notes to an agent.'
    )
  }),
  'browser-logins': () => ({
    title: translate('contextualTour.steps.browser-logins.title', 'Stay logged in'),
    body: translate(
      'contextualTour.steps.browser-logins.body',
      'Bring your existing logins into Orca to stay signed in immediately.'
    )
  }),
  'client-hosted-browser-intro': () => ({
    title: translate(
      'auto.components.contextual.tours.contextual.tour.overlay.measurement.client.hosted.browser.intro.title',
      'This page renders on your desktop'
    ),
    body: translate(
      'auto.components.contextual.tours.contextual.tour.overlay.measurement.client.hosted.browser.intro.body',
      'Remote browser tabs now render on this device. Network traffic still goes through the remote host.'
    )
  }),
  'tasks-source': () => ({
    title: translate('contextualTour.steps.tasks-source.title', 'Choose the work source'),
    body: translate(
      'contextualTour.steps.tasks-source.body',
      'Switch between connected providers and project filters without changing pages.'
    )
  }),
  'tasks-filter': () => ({
    title: translate('contextualTour.steps.tasks-filter.title', 'Filter to the work you need'),
    body: translate(
      'contextualTour.steps.tasks-filter.body',
      'Use presets and search to narrow issues, reviews, merge requests, or tasks.'
    )
  }),
  'tasks-start': () => ({
    title: translate('contextualTour.steps.tasks-start.title', 'Start from work items'),
    body: translate(
      'contextualTour.steps.tasks-start.body',
      'Use Start or Open on a task, issue, review, or merge request to bring its context into a workspace.'
    )
  }),
  'automations-intro': () => ({
    title: translate(
      'auto.components.contextual.tours.contextual.tour.overlay.measurement.automations.intro.title',
      'What is an automation?'
    ),
    body: translate(
      'auto.components.contextual.tours.contextual.tour.overlay.measurement.automations.intro.body',
      'Automations run agent work on a schedule. Add an automation by clicking this button.'
    )
  }),
  'automations-results': () => ({
    title: translate(
      'auto.components.contextual.tours.contextual.tour.overlay.measurement.automations.results.title',
      'Find the results'
    ),
    body: translate(
      'auto.components.contextual.tours.contextual.tour.overlay.measurement.automations.results.body',
      'Runs show when automations ran, what happened, and where to inspect their output.'
    )
  }),
  'floating-repos': () => ({
    title: translate('contextualTour.steps.floating-repos.title', 'Run an agent across every repo'),
    body: translate(
      'contextualTour.steps.floating-repos.body',
      'Agents here run in any folder you choose. Point one at the directory above your services to work across all your repos at once.'
    )
  }),
  'floating-scratch': () => ({
    title: translate('contextualTour.steps.floating-scratch.title', 'Or use it as a scratchpad'),
    body: translate(
      'contextualTour.steps.floating-scratch.body',
      'Open agents, scratch terminals, notes, and browser tabs without cluttering the worktree you\u2019re focused on.'
    )
  }),
  'creation-project': () => ({
    title: translate('contextualTour.steps.creation-project.title', 'Pick a project'),
    body: translate(
      'contextualTour.steps.creation-project.body',
      'Choose a Git repository or an ordinary folder. Git worktrees isolate branches; folder workspaces use the selected directory.'
    )
  }),
  'creation-name': () => ({
    title: translate(
      'contextualTour.steps.creation-name.title',
      'Name it, or start from existing work'
    ),
    body: translate(
      'contextualTour.steps.creation-name.body',
      'Start from a linked task for a short issue or PR name. Or leave it blank to auto-name it from your first agent message.'
    )
  }),
  'creation-agent': () => ({
    title: translate(
      'contextualTour.steps.creation-agent.title',
      'Choose what agent starts the work'
    ),
    body: translate(
      'contextualTour.steps.creation-agent.body',
      'Pick the agent that should be opened when this worktree is created.'
    )
  })
}

const ACTIONS: Partial<Record<ContextualTourStepAction['kind'], () => string>> = {
  'split-terminal-pane': () =>
    translate('contextualTour.actions.split-terminal-pane', 'Split terminal'),
  complete: () => translate('contextualTour.actions.complete', 'Got it'),
  'open-client-hosted-browser-settings': () =>
    translate('contextualTour.actions.open-client-hosted-browser-settings', 'Browser settings')
}

function localizeAction(
  action: ContextualTourStepAction | undefined
): ContextualTourStepAction | undefined {
  return action ? { ...action, label: ACTIONS[action.kind]?.() ?? action.label } : undefined
}

export function localizeContextualTourStep(step: ContextualTourStep): ContextualTourStep {
  return {
    ...step,
    ...(step.id ? COPY[step.id]?.() : {}),
    primaryAction: localizeAction(step.primaryAction),
    secondaryAction: localizeAction(step.secondaryAction)
  }
}
