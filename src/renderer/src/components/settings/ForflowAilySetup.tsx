import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useAppStore } from '@/store'
import { isWebClientLocation } from '@/lib/web-client-location'
import { getRendererAppPlatform } from '@/lib/renderer-app-platform'
import { readIpcErrorMessage } from '@/lib/ipc-error'
import { resolveLocalAccountRuntimeTarget } from '../../../../shared/local-account-runtime'
import type { AilyBinding, AilyPartner } from '../../../../shared/forflow-aily'

function LocalAilySetup(): React.JSX.Element {
  const [connection, setConnection] = useState<AilyBinding | null>(null)
  const [partners, setPartners] = useState<AilyPartner[] | null>(null)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    void window.api.forflowAily
      ?.status()
      .then((status) => {
        if (mounted.current) {
          setConnection(status.connection)
        }
      })
      .catch(() => {
        if (mounted.current) {
          setError('暂时无法检查伙伴连接，请重试。')
        }
      })
      .finally(() => {
        if (mounted.current) {
          setBusy(false)
        }
      })
    return () => {
      mounted.current = false
    }
  }, [])

  const act = async (action: 'discover' | 'connect' | 'disconnect'): Promise<void> => {
    const api = window.api.forflowAily
    if (!api || busy) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (action === 'discover') {
        const result = await api.discover()
        if (mounted.current) {
          setPartners(result.partners)
          setHasMore(result.hasMore)
          setSelected(
            result.partners.find((p) => p.chatId === connection?.partner.chatId)?.chatId ??
              (result.partners.length === 1 ? result.partners[0].chatId : '')
          )
        }
      } else if (action === 'connect') {
        const binding = await api.connect(selected)
        if (mounted.current) {
          setConnection(binding)
          setPartners(null)
        }
      } else {
        await api.disconnect()
        if (mounted.current) {
          setConnection(null)
          setPartners(null)
          setSelected('')
        }
      }
    } catch (cause) {
      if (mounted.current) {
        setError(readIpcErrorMessage(cause) ?? '连接未完成，请重试。')
      }
    } finally {
      if (mounted.current) {
        setBusy(false)
      }
    }
  }

  return (
    <div className="space-y-3">
      {connection ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">已连接 · {connection.partner.name}</p>
          <p className="text-sm text-muted-foreground">
            在新任务中选择“豆包工作伙伴”，即可继续这段飞书对话。
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">读取当前飞书账号的伙伴，选择要继续的对话。</p>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {partners?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selected} onValueChange={setSelected} disabled={busy}>
            <SelectTrigger aria-label="飞书中的伙伴">
              <SelectValue placeholder="选择一位伙伴" />
            </SelectTrigger>
            <SelectContent>
              {partners.map((partner) => (
                <SelectItem key={partner.chatId} value={partner.chatId}>
                  {partner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={busy || !selected} onClick={() => void act('connect')}>
            连接所选伙伴
          </Button>
        </div>
      ) : null}
      {partners?.length === 0 ? (
        <p className="text-sm">还没有找到伙伴。在飞书中打开豆包工作伙伴并发起对话，再回来刷新。</p>
      ) : null}
      {hasMore && partners ? (
        <p className="text-xs text-muted-foreground">
          这里只显示部分对话。未找到所需伙伴时，在飞书中打开它并发送消息，再刷新列表。
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={connection || partners ? 'outline' : 'default'}
          disabled={busy}
          onClick={() => void act('discover')}
        >
          {busy ? '正在读取…' : partners ? '刷新伙伴' : connection ? '更换伙伴' : '查找飞书伙伴'}
        </Button>
        {connection ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act('disconnect')}>
            断开伙伴
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function ForflowAilySetup(): React.JSX.Element {
  const local = useAppStore(
    (s) =>
      s.settings !== null &&
      !s.settings.activeRuntimeEnvironmentId &&
      resolveLocalAccountRuntimeTarget(s.settings, getRendererAppPlatform()).runtime === 'host'
  )
  if (!local || isWebClientLocation() || !window.api.forflowAily) {
    return <p className="text-sm text-muted-foreground">切回本机桌面后，即可选择飞书中的伙伴。</p>
  }
  return <LocalAilySetup />
}
