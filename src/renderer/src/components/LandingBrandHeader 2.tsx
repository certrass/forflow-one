import logo from '../../../../resources/logo.svg'
import { isForflowBuild } from '../../../shared/product-branding'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

export function LandingBrandHeader(): React.JSX.Element {
  const forflow = isForflowBuild()
  return (
    <>
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-2xl border border-border',
          forflow ? 'h-16 w-48' : 'size-20 bg-card'
        )}
      >
        <img
          src={logo}
          alt={translate('auto.components.Landing.520304a067', 'Orca logo')}
          className={forflow ? 'size-48 shrink-0 object-contain' : 'size-12'}
        />
      </div>
      <h1 className="text-4xl font-bold text-foreground tracking-tight">
        {translate('auto.components.Landing.6ca6ff404e', 'ORCA')}
      </h1>
      {forflow && (
        <p className="text-sm text-muted-foreground text-center">
          {translate(
            'forflow.productDescription',
            'A private agent workbench for AI and development teams.'
          )}
          <br />
          {translate(
            'forflow.productWorkflow',
            'Organize parallel tasks, inspect changes, and review the results in one workspace.'
          )}
        </p>
      )}
    </>
  )
}
