import { useCallback, useEffect, useRef, useState } from 'react'
import type { AilyBinding, AilyMessage, AilyPartner } from '../../../../shared/forflow-aily'
import { createBrowserUuid } from '../../lib/browser-uuid'
import { readIpcErrorMessage } from '../../lib/ipc-error'
import { ailyCopy } from './aily-copy'

export function mergeAilyMessages(
  current: AilyMessage[],
  incoming: AilyMessage[],
  older = false
): AilyMessage[] {
  const ids = new Set(incoming.map((message) => message.id))
  const remaining = current.filter((message) => !ids.has(message.id))
  return older ? [...incoming, ...remaining] : [...remaining, ...incoming]
}

export function useAilyChat() {
  const [connection, setConnection] = useState<AilyBinding | null>(null)
  const [installed, setInstalled] = useState<boolean | null>(null)
  const [partners, setPartners] = useState<AilyPartner[] | null>(null)
  const [partial, setPartial] = useState(false)
  const [messages, setMessages] = useState<AilyMessage[]>([])
  const [olderToken, setOlderToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  const fetching = useRef(false)
  const historyLoaded = useRef(false)
  const sendLock = useRef(false)
  const request = useRef<{ text: string; requestId: string } | null>(null)
  const api = window.api.forflowAily
  const report = useCallback(
    (value: unknown) => setError(readIpcErrorMessage(value) ?? ailyCopy().failed),
    []
  )

  useEffect(() => {
    let disposed = false
    const invalidate = () => {
      generation.current++
    }
    if (api) {
      void api
        .status()
        .then((status) => {
          if (!disposed) {
            setInstalled(status.installed)
            setConnection(status.connection)
          }
        })
        .catch((value: unknown) => {
          if (!disposed) {
            report(value)
          }
        })
    }
    return () => {
      disposed = true
      invalidate()
    }
  }, [api, report])

  const refresh = useCallback(
    async (token?: string) => {
      if (!api || !connection || fetching.current) {
        return
      }
      fetching.current = true
      const revision = generation.current
      setLoading(true)
      try {
        const page = await api.messages(token)
        if (revision !== generation.current) {
          return
        }
        setMessages((current) => mergeAilyMessages(current, page.messages, Boolean(token)))
        if (token || !historyLoaded.current) {
          setOlderToken(page.olderPageToken)
        }
        historyLoaded.current = true
        setError(null)
      } catch (value) {
        if (revision === generation.current) {
          report(value)
        }
      } finally {
        fetching.current = false
        if (revision === generation.current) {
          setLoading(false)
        }
      }
    },
    [api, connection, report]
  )

  useEffect(() => {
    if (!connection) {
      return
    }
    void refresh()
    const timer = setInterval(() => {
      void refresh()
    }, 8_000)
    return () => clearInterval(timer)
  }, [connection, refresh])

  const discover = async (): Promise<void> => {
    if (!api || busy) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const found = await api.discover()
      setPartners(found.partners)
      setPartial(found.hasMore)
      if (found.partners.length === 1) {
        setConnection(await api.connect(found.partners[0].chatId))
      }
    } catch (value) {
      report(value)
    } finally {
      setBusy(false)
    }
  }

  const connect = async (chatId: string): Promise<void> => {
    if (!api || busy) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      setConnection(await api.connect(chatId))
    } catch (value) {
      report(value)
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async (): Promise<void> => {
    if (!api || busy || sendLock.current) {
      return
    }
    setBusy(true)
    try {
      await api.disconnect()
      generation.current++
      setConnection(null)
      setMessages([])
      setOlderToken(null)
      historyLoaded.current = false
      setLoading(false)
      setPartners(null)
      setError(null)
      request.current = null
    } catch (value) {
      report(value)
    } finally {
      setBusy(false)
    }
  }

  const send = async (text: string): Promise<boolean> => {
    if (!api || !connection || sendLock.current || !text.trim()) {
      return false
    }
    sendLock.current = true
    setSending(true)
    setError(null)
    if (request.current?.text !== text.trim()) {
      request.current = { text: text.trim(), requestId: createBrowserUuid() }
    }
    try {
      const sent = await api.send(request.current)
      setMessages((current) =>
        mergeAilyMessages(current, [
          {
            id: sent.messageId,
            role: 'user',
            text: text.trim(),
            time: ''
          }
        ])
      )
      request.current = null
      await refresh()
      return true
    } catch (value) {
      report(value)
      return false
    } finally {
      sendLock.current = false
      setSending(false)
    }
  }

  return {
    available: Boolean(api),
    connection,
    installed,
    partners,
    partial,
    messages,
    olderToken,
    busy,
    sending,
    loading,
    error,
    refresh,
    discover,
    connect,
    disconnect,
    send
  }
}
