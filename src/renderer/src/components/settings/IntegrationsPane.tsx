import { ForflowFeishuConnection } from './ForflowFeishuConnection'
import { isForflowBuild } from '../../../../shared/product-branding'
import { useAppStore } from '@/store'
import { normalizeVisibleTaskProviders } from '../../../../shared/task-providers'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  AzureDevOpsIntegrationCard,
  BitbucketIntegrationCard,
  GiteaIntegrationCard,
  GitHubIntegrationCard,
  GitLabIntegrationCard
} from './source-control-integration-cards'
import { JiraIntegrationCard, LinearIntegrationCard } from './task-tracker-integration-cards'
import { useIntegrationProviderStatusRefresh } from './use-integration-provider-status-refresh'
import { translate } from '@/i18n/i18n'
export { getIntegrationsPaneSearchEntries } from './integrations-search'

export function IntegrationsPane(): React.JSX.Element {
  useIntegrationProviderStatusRefresh()
  const openTaskPage = useAppStore((s) => s.openTaskPage)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const browseFeishu = (): void => {
    const visible = normalizeVisibleTaskProviders(
      useAppStore.getState().settings?.visibleTaskProviders
    )
    void updateSettings({ visibleTaskProviders: [...new Set([...visible, 'feishu' as const])] })
      .then(() => {
        openTaskPage({ taskSource: 'feishu' })
      })
      .catch(() => toast.error('无法保存任务来源设置，请重试。'))
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            {translate('auto.components.settings.IntegrationsPane.298c65ecac', 'Review providers')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.IntegrationsPane.1683acbac4',
              'Connect the source hosts Orca can use for pull requests, merge requests, checks, and review status.'
            )}
          </p>
        </div>
        <div className="space-y-3">
          <GitHubIntegrationCard />
          <GitLabIntegrationCard />
          <BitbucketIntegrationCard />
          <AzureDevOpsIntegrationCard />
          <GiteaIntegrationCard />
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            {translate('auto.components.settings.IntegrationsPane.70e885705b', 'Task providers')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.IntegrationsPane.3ba07f933b',
              'Connect issue trackers Orca can use to browse tasks and start workspaces with linked context.'
            )}
          </p>
        </div>
        <div className="space-y-3">
          {isForflowBuild() ? (
            <>
              <ForflowFeishuConnection onBrowse={browseFeishu} />
              <Button variant="outline" size="sm" onClick={browseFeishu}>
                打开飞书任务入口
              </Button>
            </>
          ) : null}
          <LinearIntegrationCard />
          <JiraIntegrationCard />
        </div>
      </section>
    </div>
  )
}
