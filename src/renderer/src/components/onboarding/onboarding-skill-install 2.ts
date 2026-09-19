import { isForflowBuild } from '../../../../shared/product-branding'
import { installForflowBundledSkills } from '../settings/install-forflow-bundled-skills'
import type {
  OnboardingFeatureSetupDeps,
  OnboardingFeatureSetupWarning
} from './onboarding-feature-setup'

export async function completeOnboardingSkillSetup(
  names: string[],
  clipboardText: string | null,
  deps: OnboardingFeatureSetupDeps,
  warnings: OnboardingFeatureSetupWarning[]
): Promise<boolean> {
  try {
    if (isForflowBuild()) {
      await installForflowBundledSkills(names)
    } else if (clipboardText) {
      await deps.writeClipboardText(clipboardText)
      return true
    }
  } catch (error) {
    warnings.push({
      featureId: 'skills',
      message: error instanceof Error ? error.message : String(error)
    })
  }
  return false
}
