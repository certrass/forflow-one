import { isForflowBuild } from '../../../../shared/product-branding'
import { createElement } from 'react'
import type { LucideProps } from 'lucide-react'
import { ListChecks } from 'lucide-react'
import logo from '../../../../../resources/logo.svg'
import { cn } from '@/lib/utils'

export function OrcaLogoSettingsIcon({ className }: LucideProps): React.JSX.Element {
  if (isForflowBuild()) {
    return createElement(ListChecks, { className, 'aria-hidden': true })
  }
  return createElement('img', {
    src: logo,
    alt: '',
    'aria-hidden': true,
    className: cn('object-contain', !isForflowBuild() && 'invert dark:invert-0', className)
  })
}
