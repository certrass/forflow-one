import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ForflowApprovalRequest } from '../../../shared/forflow-approval'
import { isForflowBuild } from '../../../shared/product-branding'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { translate } from '@/i18n/i18n'

export function ForflowApprovalDialog(): React.JSX.Element | null {
  const [requests, setRequests] = useState<ForflowApprovalRequest[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  useEffect(() => {
    const api = window.api.forflowApproval
    if (!isForflowBuild() || !api) {
      return
    }
    let active = true
    let revision = 0
    const refresh = (): void => {
      const current = ++revision
      void api.pending().then(
        (next) => {
          if (active && current === revision) {
            setRequests(next)
          }
        },
        () => {
          if (active && current === revision) {
            setRequests([])
          }
        }
      )
    }
    const unsubscribe = api.onChanged(refresh)
    refresh()
    return () => {
      active = false
      unsubscribe()
    }
  }, [])
  const request = requests[0]
  const decide = async (allow: boolean): Promise<void> => {
    if (!request || busyId === request.id) {
      return
    }
    setBusyId(request.id)
    try {
      await window.api.forflowApproval?.decide(request.id, allow)
    } catch {
      toast.error(translate('forflow.approval.failed', '确认未提交，请重试或取消操作。'))
    } finally {
      setBusyId(null)
    }
  }
  if (!request) {
    return null
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          void decide(false)
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {request.kind === 'upload'
              ? translate('forflow.approval.upload', '确认数据传输')
              : translate('forflow.approval.permission', '确认网站权限')}
          </DialogTitle>
          <DialogDescription className="break-all whitespace-pre-line">
            {request.destination}
            {'\n\n'}
            {request.description}
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {translate('forflow.approval.expiry', '两分钟未确认将自动取消；此操作不会永久授权。')}
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={busyId === request.id}
            onClick={() => void decide(false)}
          >
            {translate('forflow.approval.cancel', '取消')}
          </Button>
          <Button disabled={busyId === request.id} onClick={() => void decide(true)}>
            {translate('forflow.approval.allow', '允许本次操作')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
