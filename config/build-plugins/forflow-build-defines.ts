import { forflowBuildEnabled } from './forflow-branding'
import { jevEvaluatorFingerprint } from './jev-evaluator-fingerprint'

export const forflowBuildDefines = {
  FORFLOW_BRAND_ENABLED: JSON.stringify(forflowBuildEnabled),
  __FORFLOW_JEV_EVALUATOR_HASH__: JSON.stringify(jevEvaluatorFingerprint())
}
