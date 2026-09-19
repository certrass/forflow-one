import type {
  OnboardingFeatureSetupDeps,
  OnboardingFeatureSetupWarning
} from './onboarding-feature-setup'

export async function registerOnboardingCli(
  deps: OnboardingFeatureSetupDeps,
  warnings: OnboardingFeatureSetupWarning[]
): Promise<boolean> {
  let cliTouched = false
  try {
    const status = await deps.getCliStatus()
    if (!status.supported) {
      warnings.push({
        featureId: 'cli',
        message: status.detail ?? 'Orca CLI registration is not available on this platform.'
      })
    } else if (status.pathConfigured === null) {
      // An unknown registry read cannot safely drive a PATH read-modify-write.
      warnings.push({
        featureId: 'cli',
        message: status.detail ?? 'Orca could not check your Windows user PATH.'
      })
    } else if (status.state !== 'installed' || status.pathConfigured === false) {
      await deps.showCliRegistrationPrompt?.()
      const next = await deps.installCli()
      cliTouched = true
      if (next.state !== 'installed') {
        warnings.push({
          featureId: 'cli',
          message: next.detail ?? 'Orca CLI registration needs attention.'
        })
      } else if (next.pathConfigured !== true && next.detail) {
        warnings.push({ featureId: 'cli', message: next.detail })
      }
    }
  } catch (error) {
    warnings.push({
      featureId: 'cli',
      message: error instanceof Error ? error.message : String(error)
    })
  }
  return cliTouched
}
