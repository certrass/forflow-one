import { translate } from '@/i18n/i18n'
import {
  FORFLOW_DOMESTIC_CONNECTIONS_SECTION,
  getDomesticCliDetectionLabel,
  getForflowDomesticConnections
} from '@/lib/forflow-domestic-connections'
import { SettingsBadge, SettingsSubsectionHeader } from './SettingsFormControls'

export function ForflowDomesticConnections({
  detectedIds,
  detectionFailed,
  hostName
}: {
  detectedIds: ReadonlySet<string> | null
  detectionFailed: boolean
  hostName: string | null
}): React.JSX.Element {
  return (
    <section
      id={FORFLOW_DOMESTIC_CONNECTIONS_SECTION}
      data-testid={FORFLOW_DOMESTIC_CONNECTIONS_SECTION}
      className="space-y-3"
    >
      <SettingsSubsectionHeader
        title={translate('forflow.domestic.title', 'Domestic models and agents')}
        description={translate(
          'forflow.domestic.description',
          'Choose a connection below, install and sign in on the execution host, then refresh the agent list and select the detected CLI. CLI launch and conversation-history import have separate support.'
        )}
      />
      <p className="text-xs text-muted-foreground">
        {translate('forflow.domestic.host', 'CLI detection host: {{host}}', {
          host: hostName ?? translate('forflow.domestic.local', 'Local execution environment')
        })}
      </p>
      <div className="divide-y divide-border rounded-md border border-border px-3">
        {getForflowDomesticConnections().map((connection) => (
          <div key={connection.id} className="space-y-2 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium">{connection.title}</h3>
              <SettingsBadge tone="muted">{connection.history}</SettingsBadge>
            </div>
            <p className="text-xs text-muted-foreground">{connection.description}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <code>{connection.command}</code>
              <span className="text-muted-foreground">
                {connection.agentId
                  ? getDomesticCliDetectionLabel(
                      detectedIds ? detectedIds.has(connection.agentId) : null,
                      detectionFailed
                    )
                  : translate(
                      'forflow.domestic.modelConfiguration',
                      'Configure in your agent; model connectivity has not been checked here'
                    )}
              </span>
              <a
                href={connection.documentation}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
                aria-label={translate('forflow.domestic.docsFor', 'Setup guide for {{name}}', {
                  name: connection.title
                })}
              >
                {translate('forflow.domestic.docs', 'Official setup guide')}
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
