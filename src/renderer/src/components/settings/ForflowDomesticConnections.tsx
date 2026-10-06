import { useState } from 'react'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { AgentIcon } from '@/lib/agent-catalog'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  FORFLOW_DOMESTIC_CONNECTIONS_SECTION,
  getDomesticCliDetectionLabel,
  getForflowDomesticConnections
} from '@/lib/forflow-domestic-connections'
import { ForflowAilySetup } from './ForflowAilySetup'
import { SettingsBadge, SettingsSubsectionHeader } from './SettingsFormControls'

export function ForflowDomesticConnections({
  detectedIds,
  detectionFailed,
  hostName,
  isRefreshing = false,
  onRefresh
}: {
  detectedIds: ReadonlySet<string> | null
  detectionFailed: boolean
  hostName: string | null
  isRefreshing?: boolean
  onRefresh?: () => void
}): React.JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(null)
  const connections = getForflowDomesticConnections()
  const model = connections.find((connection) => !connection.agentId)
  return (
    <section
      id={FORFLOW_DOMESTIC_CONNECTIONS_SECTION}
      data-testid={FORFLOW_DOMESTIC_CONNECTIONS_SECTION}
      className="space-y-4"
    >
      <SettingsSubsectionHeader
        title={translate('forflow.domestic.title', 'Connect your agents')}
        description={translate(
          'forflow.domestic.description',
          'Connect an agent, then choose it when starting work on a project.'
        )}
        action={
          onRefresh ? (
            <Button variant="outline" size="sm" disabled={isRefreshing} onClick={onRefresh}>
              <RefreshCw />
              {isRefreshing
                ? translate('forflow.domestic.refreshing', 'Checking…')
                : translate('forflow.domestic.refresh', 'Check again')}
            </Button>
          ) : undefined
        }
      />
      {hostName ? (
        <p className="text-xs text-muted-foreground">
          {translate('forflow.domestic.host', 'Connect on: {{host}}', { host: hostName })}
        </p>
      ) : null}
      <div className="divide-y divide-border">
        {connections
          .filter((connection) => connection.agentId)
          .map((connection) => (
            <div key={connection.id} className="py-4">
              <Collapsible
                open={expanded === connection.id}
                onOpenChange={(open) => setExpanded(open ? connection.id : null)}
              >
                <div className="flex flex-wrap items-center gap-3">
                  {connection.agentId ? <AgentIcon agent={connection.agentId} size={24} /> : null}
                  <div className="min-w-0 flex-1 basis-48 space-y-1">
                    <h3 className="text-sm font-medium">{connection.title}</h3>
                    <p className="text-sm text-muted-foreground">{connection.description}</p>
                  </div>
                  <SettingsBadge tone="muted">
                    {getDomesticCliDetectionLabel(
                      detectedIds ? detectedIds.has(connection.agentId ?? '') : null,
                      detectionFailed
                    )}
                  </SettingsBadge>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={translate(
                        'forflow.domestic.guideFor',
                        'Connection guide for {{name}}',
                        { name: connection.title }
                      )}
                    >
                      {translate('forflow.domestic.guide', 'Connection guide')}
                      {expanded === connection.id ? <ChevronDown /> : <ChevronRight />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="mt-4 space-y-3 rounded-md bg-muted p-4">
                    {connection.id === 'aily' ? (
                      <ForflowAilySetup />
                    ) : (
                      <ol className="list-decimal space-y-2 pl-5 text-sm">
                        {connection.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    )}
                    <Button variant="link" size="sm" asChild>
                      <a href={connection.documentation} target="_blank" rel="noopener noreferrer">
                        {translate('forflow.domestic.docs', 'Official setup guide')}
                      </a>
                    </Button>
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">
                        {translate('forflow.domestic.details', 'Connection details')}
                      </summary>
                      <p className="mt-2 break-words">
                        {translate('forflow.domestic.command', 'Launch command:')}{' '}
                        <code>{connection.command}</code>
                      </p>
                    </details>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
      </div>
      {model ? (
        <details className="border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-medium">
            {translate('forflow.domestic.modelSetup', 'Use Doubao models')}
          </summary>
          <p className="mt-3 text-sm text-muted-foreground">{model.description}</p>
          <Button variant="link" size="sm" asChild>
            <a href={model.documentation} target="_blank" rel="noopener noreferrer">
              {translate('forflow.domestic.docs', 'Official setup guide')}
            </a>
          </Button>
        </details>
      ) : null}
    </section>
  )
}
