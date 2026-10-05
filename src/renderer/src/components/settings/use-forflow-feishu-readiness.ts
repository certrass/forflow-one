import { useEffect, useState } from 'react'
import { isForflowBuild } from '../../../../shared/product-branding'
import type { TaskProviderReadiness } from './task-source-setup-state'

export function useForflowFeishuReadiness(
  runtimeId: string | null | undefined
): Omit<TaskProviderReadiness, 'visible'> {
  const [readiness, setReadiness] = useState({
    connected: false,
    checking: true,
    unavailable: false
  })
  useEffect(() => {
    let current = true
    const api = window.api?.forflowFeishu
    if (!isForflowBuild() || runtimeId || !api) {
      setReadiness({ connected: false, checking: false, unavailable: true })
      return
    }
    setReadiness({ connected: false, checking: true, unavailable: false })
    void api
      .status()
      .then((status) => {
        if (current) {
          setReadiness({
            connected: Boolean(status.connection),
            checking: false,
            unavailable: false
          })
        }
      })
      .catch(() => {
        if (current) {
          setReadiness({ connected: false, checking: false, unavailable: true })
        }
      })
    return () => {
      current = false
    }
  }, [runtimeId])
  return readiness
}
