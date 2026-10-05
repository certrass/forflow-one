import { useCallback, useEffect, useRef, useState } from 'react'
import type { JevReceipt } from '../../../../shared/jev-audit-types'

export function useJevReviewChecks(reviewId: string) {
  const [receipts, setReceipts] = useState<JevReceipt[]>([])
  const [failed, setFailed] = useState(false)
  const [revision, setRevision] = useState(0)
  const currentReviewId = useRef(reviewId)
  const recorded = useRef(new Map<string, JevReceipt>())
  currentReviewId.current = reviewId
  useEffect(() => {
    let active = true
    recorded.current.clear()
    setFailed(false)
    void window.api?.forflowJevAudit
      ?.list(reviewId)
      .then((value) => {
        if (active) {
          // Keep receipts returned after this list request began.
          const merged = new Map(value.map((receipt) => [receipt.id, receipt]))
          for (const receipt of recorded.current.values()) {
            merged.set(receipt.id, receipt)
          }
          setReceipts([...merged.values()])
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
    if (receipt.reviewId !== currentReviewId.current) {
      return
    }
    recorded.current.set(receipt.id, receipt)
    setReceipts((current) => [...current.filter((entry) => entry.id !== receipt.id), receipt])
  }, [])
  return {
    receipts: receipts.filter((receipt) => receipt.reviewId === reviewId),
    failed,
    refresh,
    record
  }
}
