import { useEffect, useRef } from 'react'
import { ArrowUp, ExternalLink, Loader2, MessagesSquare, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import {
  readNativeChatDraftCache,
  writeNativeChatDraftCache
} from '../native-chat/native-chat-draft-cache'
import { useNativeChatDraft } from '../native-chat/use-native-chat-draft'
import { MessageRow } from '../native-chat/NativeChatMessageRow'
import { isForflowBuild } from '../../../../shared/product-branding'
import { ailyCopy } from './aily-copy'
import { useAilyChat } from './use-aily-chat'

const notComposing = () => false

export default function AilyPage(): React.JSX.Element {
  useTranslation()
  const copy = ailyCopy()
  const chat = useAilyChat()
  const draftScope = chat.connection
    ? `aily:${chat.connection.profile}:${chat.connection.userId}:${chat.connection.partner.chatId}`
    : 'aily:unconnected'
  const { draft, setDraft } = useNativeChatDraft(draftScope, notComposing)
  const end = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const lastMessage = chat.messages.at(-1)
  useEffect(() => {
    if (nearBottom.current) {
      end.current?.scrollIntoView({ block: 'end' })
    }
  }, [lastMessage?.id, lastMessage?.text])

  const submit = async (): Promise<void> => {
    const text = draft
    if (await chat.send(text)) {
      // A completed send must clear its cached draft even after navigation unmounts this page.
      if (readNativeChatDraftCache(draftScope) === text) {
        writeNativeChatDraftCache(draftScope, '')
      }
      setDraft((current) => (current === text ? '' : current))
      nearBottom.current = true
    }
  }

  if (!isForflowBuild() || !chat.available) {
    return <p className="p-6 text-sm">{copy.unavailable}</p>
  }
  return (
    <section className="flex h-full min-h-0 flex-col bg-background" data-testid="forflow-aily-page">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h1 className="text-base font-semibold">{copy.title}</h1>
          <p className="text-xs text-muted-foreground">
            {chat.connection?.partner.name ?? copy.subtitle}
          </p>
        </div>
        {chat.connection ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={chat.loading}
              onClick={() => {
                void chat.refresh()
              }}
            >
              <RefreshCw />
              {copy.refresh}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://applink.feishu.cn/client/chat/open?openChatId=${chat.connection.partner.chatId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink />
                {copy.open}
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={chat.busy || chat.sending}
              onClick={() => {
                void chat.disconnect()
              }}
            >
              {copy.change}
            </Button>
          </div>
        ) : null}
      </header>
      {chat.error ? (
        <div
          role="alert"
          className="mx-5 mt-3 rounded-md border border-border px-3 py-2 text-sm text-destructive"
        >
          {chat.error}
        </div>
      ) : null}
      {!chat.connection ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
          <MessagesSquare className="size-8 text-muted-foreground" />
          <h2 className="text-base font-medium">{copy.connect}</h2>
          <p className="max-w-lg text-sm text-muted-foreground">{copy.sync}</p>
          {chat.installed === false ? (
            <Button asChild variant="outline">
              <a href="https://github.com/larksuite/cli" target="_blank" rel="noopener noreferrer">
                {copy.setup}
                <ExternalLink />
              </a>
            </Button>
          ) : (
            <Button
              disabled={chat.busy}
              onClick={() => {
                void chat.discover()
              }}
            >
              {chat.busy ? <Loader2 className="animate-spin" /> : null}
              {chat.busy ? copy.finding : copy.connect}
            </Button>
          )}
          {chat.partners?.length === 0 ? (
            <p className="max-w-lg text-sm text-muted-foreground">{copy.empty}</p>
          ) : null}
          {(chat.partners?.length ?? 0) > 1 ? (
            <div className="space-y-2">
              <p className="text-sm">{copy.choose}</p>
              {chat.partners?.map((partner) => (
                <Button
                  key={partner.chatId}
                  variant="outline"
                  disabled={chat.busy}
                  onClick={() => {
                    void chat.connect(partner.chatId)
                  }}
                >
                  {partner.name}
                </Button>
              ))}
            </div>
          ) : null}
          {chat.partial ? <p className="text-sm text-muted-foreground">{copy.partial}</p> : null}
        </div>
      ) : (
        <>
          <div
            className="scrollbar-sleek flex-1 overflow-y-auto px-5 py-6"
            onScroll={(event) => {
              const el = event.currentTarget
              nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
            }}
          >
            <div className="mx-auto max-w-3xl space-y-6">
              {chat.olderToken ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={chat.loading}
                  onClick={() => {
                    void chat.refresh(chat.olderToken ?? undefined)
                  }}
                >
                  {copy.earlier}
                </Button>
              ) : null}
              {chat.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {chat.loading ? copy.loading : copy.noMessages}
                </p>
              ) : null}
              {chat.messages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={{
                    id: message.id,
                    role: message.role,
                    blocks: [{ type: 'text', text: message.text }],
                    timestamp: null,
                    source: 'transcript'
                  }}
                  expandSignal={false}
                  onScrollMessageToTop={(el) => el.scrollIntoView({ block: 'start' })}
                />
              ))}
              <div ref={end} />
            </div>
          </div>
          <form
            className="mx-auto w-full max-w-3xl shrink-0 space-y-2 px-5 pb-5"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <Textarea
              aria-label={copy.placeholder}
              placeholder={copy.placeholder}
              value={draft}
              maxLength={12_000}
              rows={3}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  void submit()
                }
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground" role="status">
                {chat.sending
                  ? copy.sending
                  : lastMessage?.role === 'user'
                    ? copy.waiting
                    : copy.keyboard}
              </span>
              <Button type="submit" size="sm" disabled={chat.sending || !draft.trim()}>
                <ArrowUp />
                {copy.send}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{copy.sync}</p>
          </form>
        </>
      )}
    </section>
  )
}
