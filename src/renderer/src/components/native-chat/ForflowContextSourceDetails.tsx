import { ChevronRight, FileJson } from 'lucide-react'
import type { ForflowContextPreview } from '../../../../shared/forflow-context-packet'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'

export function ForflowContextSourceDetails({
  preview,
  disabled,
  onCopyReceipt
}: {
  preview: ForflowContextPreview
  disabled: boolean
  onCopyReceipt: () => void
}): React.JSX.Element {
  const { packet } = preview
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="xs" className="group">
          <ChevronRight className="transition-transform group-data-[state=open]:rotate-90 motion-reduce:transition-none" />
          {translate('forflow.contextBeta.details', 'Source details')}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 pt-3 text-xs text-muted-foreground">
          <p>
            {translate(
              'forflow.contextBeta.selection',
              'Includes your messages and up to three recent Codex replies. Add attachments and tool results separately.'
            )}
          </p>
          <dl className="space-y-2">
            <div>
              <dt>{translate('forflow.contextBeta.scope', 'Current session')}</dt>
              <dd className="break-all font-mono">{packet.scope.sessionId || '—'}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt>{translate('forflow.contextBeta.size', 'Source data size (UTF-8 bytes)')}</dt>
              <dd>
                {preview.bytes.toLocaleString()} / {preview.budgetBytes.toLocaleString()}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt>
                {translate(
                  'forflow.contextBeta.omitted',
                  'Omitted user / assistant / tool or system messages'
                )}
              </dt>
              <dd>
                {packet.omitted.userMessages} / {packet.omitted.assistantMessages} /{' '}
                {packet.omitted.nonConversationMessages}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt>
                {translate(
                  'forflow.contextBeta.unsupported',
                  'Unincluded attachment or tool blocks / unpersisted messages'
                )}
              </dt>
              <dd>
                {packet.omitted.nonTextBlocks} / {packet.omitted.nonTranscriptMessages}
              </dd>
            </div>
          </dl>
          <Button variant="outline" size="xs" disabled={disabled} onClick={onCopyReceipt}>
            <FileJson />
            {translate('forflow.contextBeta.copyReceipt', 'Copy source receipt')}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
