import { useEffect, useRef } from 'react'

export function shouldShowNativeChatWorking(args: {
  isConversation: boolean
  working: boolean
  interrupted: boolean
}): boolean {
  return args.isConversation && args.working && !args.interrupted
}

/**
 * Clear local Stop suppression when live work ends, or when a newer working
 * epoch starts while suppressed (Stop → immediate next turn without a ready gap).
 */
export function shouldClearNativeChatWorkingSuppression(args: {
  working: boolean
  interrupted?: boolean
  /** Hook `stateStartedAt` for the current working epoch, when known. */
  workingEpoch?: number | null
  /** Previous observed working epoch; used to detect a new generation. */
  previousWorkingEpoch?: number | null
}): boolean {
  if (!args.working) {
    return true
  }
  // Why: interrupt + next-turn can coalesce so `working` never goes false; a
  // newer epoch means the user started another generation and must see it.
  if (
    args.interrupted === true &&
    args.workingEpoch != null &&
    args.previousWorkingEpoch != null &&
    args.workingEpoch > args.previousWorkingEpoch
  ) {
    return true
  }
  return false
}

export function useNativeChatWorkingSuppression({
  working,
  interrupted,
  workingEpoch,
  setInterrupted
}: {
  working: boolean
  interrupted: boolean
  workingEpoch: number | null
  setInterrupted: (value: boolean) => void
}): void {
  const previousWorkingEpochRef = useRef<number | null>(null)
  useEffect(() => {
    if (
      shouldClearNativeChatWorkingSuppression({
        working: working,
        interrupted: interrupted,
        workingEpoch: workingEpoch,
        previousWorkingEpoch: previousWorkingEpochRef.current
      })
    ) {
      setInterrupted(false)
    }
    if (working && workingEpoch != null) {
      previousWorkingEpochRef.current = workingEpoch
    }
    if (!working) {
      previousWorkingEpochRef.current = null
    }
  }, [working, interrupted, workingEpoch, setInterrupted])
}
