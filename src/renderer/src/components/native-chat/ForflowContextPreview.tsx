import { useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardCopy } from 'lucide-react'
import { toast } from 'sonner'
import type { AgentType, NativeChatMessage } from '../../../../shared/native-chat-types'
import {
  buildForflowContextPreview,
  encodeForflowContextReceipt,
  formatForflowContextText,
  type ForflowContextScope
} from '../../../../shared/forflow-context-packet'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { ForflowContextSourceDetails } from './ForflowContextSourceDetails'
import { forflowContextBlockingCopy } from './forflow-context-blocking-copy'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  const copy = async (format: 'text' | 'receipt'): Promise<void> => {
    if (!preview?.canCopy || stale || props.busy || copying) {
      return
    }
    const expected = generation.current
    setCopying(true)
    try {
      const text =
        format === 'receipt'
          ? await encodeForflowContextReceipt(preview)
          : formatForflowContextText(preview, {
              title: translate('forflow.contextBeta.excerpt', 'Conversation excerpt'),
              user: translate('forflow.contextBeta.exportUser', 'User'),
              assistant: 'Codex'
            })
      if (expected !== generation.current || current.current !== snapshot.revision) {
        return
      }
      await navigator.clipboard.writeText(text)
      toast.success(
        format === 'receipt'
          ? translate('forflow.contextBeta.receiptCopied', 'Source receipt copied')
          : translate('forflow.contextBeta.copied', 'Content copied')
      )
    } catch {
      toast.error(translate('forflow.contextBeta.copyFailed', 'Could not copy. Please try again.'))
    } finally {
      setCopying(false)
    }
  }
  const copyDisabled = !preview?.canCopy || stale || props.busy || copying
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
            <ClipboardCopy />
            {translate('forflow.contextBeta.open', 'Copy conversation')}
          </Button>
        </DialogTrigger>
        <DialogContent
          className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-xl"
          data-forflow-context-preview=""
          data-native-chat-typing-redirect-ignore="true"
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{translate('forflow.contextBeta.title', 'Copy conversation')}</DialogTitle>
            <DialogDescription>
              {translate(
                'forflow.contextBeta.intro',
                'Copy this excerpt and paste it into a new conversation to continue.'
              )}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <>
              <div className="min-h-0 space-y-4 overflow-y-auto scrollbar-sleek">
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
                    <span>{translate('forflow.contextBeta.excerpt', 'Conversation excerpt')}</span>
                    <span>
                      {translate('forflow.contextBeta.count', '{{count}} messages', {
                        count: preview.packet.items.length
                      })}
                    </span>
                  </div>
                  <div className="divide-y divide-border px-4">
                    {preview.packet.items.map((item) => (
                      <div key={item.messageId} className="space-y-2 py-4">
                        <p className="text-xs font-medium text-muted-foreground">
                          {item.role === 'user'
                            ? translate('forflow.contextBeta.user', 'You')
                            : 'Codex'}
                        </p>
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <ForflowContextSourceDetails
                  preview={preview}
                  disabled={copyDisabled}
                  onCopyReceipt={() => void copy('receipt')}
                />
              </div>
              {props.busy ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {translate(
                    'forflow.contextBeta.busy',
                    'Codex is still working. Refresh when it finishes.'
                  )}
                </p>
              ) : stale ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {translate(
                    'forflow.contextBeta.changed',
                    'There are new messages. Refresh before copying.'
                  )}
                </p>
              ) : null}
              {preview.blockingReasons.length > 0 ? (
                <div role="status" className="space-y-1 text-sm text-muted-foreground">
                  {preview.blockingReasons.map((reason) => (
                    <p key={reason}>{forflowContextBlockingCopy(reason)}</p>
                  ))}
                </div>
              ) : null}
              <DialogFooter>
                <Button variant="ghost" disabled={props.busy || copying} onClick={capture}>
                  {translate('forflow.contextBeta.refresh', 'Refresh content')}
                </Button>
                <Button disabled={copyDisabled} onClick={() => void copy('text')}>
                  <ClipboardCopy />
                  {translate('forflow.contextBeta.copy', 'Copy content')}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
