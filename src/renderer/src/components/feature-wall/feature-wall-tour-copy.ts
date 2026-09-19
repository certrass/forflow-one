import { FEATURE_WALL_WORKFLOWS } from '../../../../shared/feature-wall-workflows'
import { getAgentsSteps } from '../../../../shared/agents-orchestration-steps'
import { getWorkbenchSteps } from '../../../../shared/workbench-steps'
import { getReviewSteps } from '../../../../shared/review-steps'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'

export const getLocalizedTourWorkflows = createLocalizedCatalog(() =>
  FEATURE_WALL_WORKFLOWS.map((workflow) => ({
    ...workflow,
    title: translate(`forflow.tour.workflows.${workflow.id}.title`, workflow.title),
    meta: translate(`forflow.tour.workflows.${workflow.id}.meta`, workflow.meta),
    lede: translate(`forflow.tour.workflows.${workflow.id}.lede`, workflow.lede)
  }))
)

function localizeStep<
  T extends { id: string; name: string; subtitle: string; description: string }
>(group: string, step: T): T {
  return {
    ...step,
    name: translate(`forflow.tour.${group}.${step.id}.name`, step.name),
    subtitle: translate(`forflow.tour.${group}.${step.id}.subtitle`, step.subtitle),
    description: translate(`forflow.tour.${group}.${step.id}.description`, step.description)
  }
}

export const getLocalizedTourAgents = createLocalizedCatalog(() =>
  getAgentsSteps().map((step) => localizeStep('agents', step))
)
export const getLocalizedTourWorkbench = createLocalizedCatalog(() =>
  getWorkbenchSteps().map((step) => localizeStep('workbench', step))
)
export const getLocalizedTourReview = createLocalizedCatalog(() =>
  getReviewSteps().map((step) => localizeStep('review', step))
)
