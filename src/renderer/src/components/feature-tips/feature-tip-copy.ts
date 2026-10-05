import type { FeatureTip } from '../../../../shared/feature-tips'
import { translate } from '@/i18n/i18n'

export function localizeFeatureTip(tip: FeatureTip | null): FeatureTip | null {
  if (!tip) {
    return null
  }
  const prefix = `featureTips.copy.${tip.id}`
  return {
    ...tip,
    eyebrow: translate(`featureTips.copy.eyebrow.${tip.eyebrow.toLowerCase()}`, tip.eyebrow),
    title: translate(`${prefix}.title`, tip.title),
    description: translate(`${prefix}.description`, tip.description),
    ctaLabel: translate(`${prefix}.ctaLabel`, tip.ctaLabel)
  }
}
