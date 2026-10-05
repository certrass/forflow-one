import { useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardCopy, ScanText } from 'lucide-react'
import { toast } from 'sonner'
import type { AgentType, NativeChatMessage } from '../../../../shared/native-chat-types'
import {
  buildForflowContextPreview,
  encodeForflowContextReceipt,
  type ForflowContextScope
} from '../../../../shared/forflow-context-packet'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { forflowContextBlockingCopy } from './forflow-context-blocking-copy'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'

type Props = {
  agent: AgentType
  scope: ForflowContextScope
  messages: readonly NativeChatMessage[]
  historyIncomplete: boolean
  busy: boolean
  sourceUnavailable?: boolean
  deliveryPending?: boolean
}

export function ForflowContextPreview(props: Props): React.JSX.Element | null {
  const enabled = useAppStore((state) => state.settings?.forflowContextPreviewBeta === true)
  return enabled && props.agent === 'codex' ? (
    <ContextPreview key={JSON.stringify(props.scope)} {...props} />
  ) : null
}

function ContextPreview(props: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const revision = useMemo(
    () => ({
      messages: props.messages,
      busy: props.busy,
      historyIncomplete: props.historyIncomplete,
      sourceUnavailable: props.sourceUnavailable,
      deliveryPending: props.deliveryPending
    }),
    [
      props.messages,
      props.busy,
      props.historyIncomplete,
      props.sourceUnavailable,
      props.deliveryPending
    ]
  )
  const [snapshot, setSnapshot] = useState<{
    revision: typeof revision
    preview: ReturnType<typeof buildForflowContextPreview>
  } | null>(null)
  const [copying, setCopying] = useState(false)
  const current = useRef(revision)
  current.current = revision
  const generation = useRef(0)
  useEffect(
    () => () => {
      generation.current++
    },
    []
  )
  const capture = (): void => {
    generation.current++
    setSnapshot({
      revision,
      preview: buildForflowContextPreview({ ...props, capturedAt: new Date().toISOString() })
    })
  }
  const stale = snapshot?.revision !== revision
  const preview = snapshot?.preview
  const copy = async (): Promise<void> => {
    if (!preview?.canCopy || stale || props.busy || copying) {
      return
    }
    const expected = generation.current
    setCopying(true)
    try {
      const receipt = await encodeForflowContextReceipt(preview)
      if (expected !== generation.current || current.current !== snapshot.revision) {
        return
      }
      await navigator.clipboard.writeText(receipt)
      toast.success(
        translate(
          'forflow.contextBeta.copied',
          'Handoff copied. Review it before sending to another agent.'
        )
      )
    } catch {
      toast.error(
        translate('forflow.contextBeta.copyFailed', 'Could not copy the handoff. Please try again.')
      )
    } finally {
      setCopying(false)
    }
  }
  return (
    <div
      className="flex shrink-0 justify-end border-t border-border px-2 py-1"
      data-forflow-context-beta=""
      data-pane-prevent-terminal-focus=""
    >
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          if (value) {
            capture()
          } else {
            generation.current++
            setSnapshot(null)
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="ghost" size="xs">
            <ScanText />
            {translate('forflow.contextBeta.open', 'Handoff preview · Beta')}
          </Button>
        </DialogTrigger>
        <DialogContent
          data-forflow-context-preview=""
          data-native-chat-typing-redirect-ignore="true"
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>
              {translate('forflow.contextBeta.title', 'Context handoff preview · Beta')}
            </DialogTitle>
            <DialogDescription>
              {translate(
                'forflow.contextBeta.intro',
                'Extracts whole user messages and up to three recent assistant replies from this conversation. This is an excerpt, not a semantic summary or approved memory.'
              )}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="max-h-[55vh] space-y-3 overflow-y-auto text-sm scrollbar-sleek">
              <p>
                {translate('forflow.contextBeta.scope', 'Current session')}:{' '}
                <span className="break-all font-mono text-xs">{props.scope.sessionId || '—'}</span>
              </p>
              <p>
                {translate(
                  'forflow.contextBeta.size',
                  'Selected text and metadata (UTF-8 bytes, not tokens)'
                )}
                : {preview.bytes.toLocaleString()} / {preview.budgetBytes.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {translate(
                  'forflow.contextBeta.omitted',
                  'Omitted user / assistant / tool or system messages'
                )}
                : {preview.packet.omitted.userMessages} / {preview.packet.omitted.assistantMessages}{' '}
                / {preview.packet.omitted.nonConversationMessages}
              </p>
              <p className="text-xs text-muted-foreground">
                {translate(
                  'forflow.contextBeta.unsupported',
                  'Unincluded attachment or tool blocks / unpersisted messages'
                )}
                : {preview.packet.omitted.nonTextBlocks} /{' '}
                {preview.packet.omitted.nonTranscriptMessages}
              </p>
              {stale || props.busy ? (
                <p role="status">
                  {translate(
                    'forflow.contextBeta.changed',
                    'Conversation changed or is still running. Wait for it to settle, then refresh the preview.'
                  )}
                </p>
              ) : null}
              {preview.blockingReasons.map((reason) => (
                <p key={reason} role="status">
                  {forflowContextBlockingCopy(reason)}
                </p>
              ))}
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-border p-3 scrollbar-sleek">
                {preview.packet.items.map((item) => (
                  <div key={item.messageId} className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {item.role === 'user'
                        ? translate('forflow.contextBeta.user', 'User original text')
                        : translate(
                            'forflow.contextBeta.assistant',
                            'Agent statement · unverified'
                          )}{' '}
                      · <span className="break-all">{item.messageId}</span>
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm">{item.text}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {translate(
                  'forflow.contextBeta.boundary',
                  'Only the loaded transcript is included. Tool results, attachments, hidden prompts and other agents are not carried over. Check sensitive content before copying. No automatic sending, persistence or authorization transfer.'
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={props.busy || copying}
                  onClick={capture}
                >
                  {translate('forflow.contextBeta.refresh', 'Refresh preview')}
                </Button>
                <Button
                  size="sm"
                  disabled={!preview.canCopy || stale || props.busy || copying}
                  onClick={() => void copy()}
                >
                  <ClipboardCopy />
                  {translate('forflow.contextBeta.copy', 'Copy handoff with source receipt')}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
