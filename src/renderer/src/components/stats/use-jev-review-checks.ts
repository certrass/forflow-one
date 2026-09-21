import { useCallback, useEffect, useState } from 'react'
import type { JevReceipt } from '../../../../shared/jev-audit-types'

export function useJevReviewChecks(reviewId: string) {
  const [receipts, setReceipts] = useState<JevReceipt[]>([])
  const [failed, setFailed] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setFailed(false)
    void window.api?.forflowJevAudit
      ?.list(reviewId)
      .then((value) => {
        if (active) {
          setReceipts(value)
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true)
        }
      })
    return () => {
      active = false
    }
  }, [reviewId, revision])
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  const record = useCallback((receipt: JevReceipt) => {
    setReceipts((current) => [...current.filter((entry) => entry.id !== receipt.id), receipt])
  }, [])
  return { receipts, failed, refresh, record }
}
