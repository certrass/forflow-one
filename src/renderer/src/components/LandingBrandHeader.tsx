import logo from '../../../../resources/logo.svg'
import { isForflowBuild } from '../../../shared/product-branding'
import { translate } from '@/i18n/i18n'

export function LandingBrandHeader(): React.JSX.Element {
  const forflow = isForflowBuild()
  return (
    <>
      {!forflow && (
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card">
          <img
            src={logo}
            alt={translate('auto.components.Landing.520304a067', 'Orca logo')}
            className="size-12"
          />
        </div>
      )}
      <h1 className="text-4xl font-bold text-foreground tracking-tight">
        {translate('auto.components.Landing.6ca6ff404e', 'ORCA')}
      </h1>
      {forflow && (
        <p className="text-sm text-muted-foreground text-center">
          {translate(
            'forflow.productDescription',
            'One workspace for your agents, tasks and results.'
          )}
          <br />
          {translate(
            'forflow.productWorkflow',
            'Give a task, explore approaches in parallel, and review the results.'
          )}
        </p>
      )}
    </>
  )
}
