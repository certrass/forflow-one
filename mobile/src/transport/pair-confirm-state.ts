import { parsePairingCode } from './pairing'
import type { PairingOffer } from './types'

export type PairConfirmRouteState =
  | { kind: 'ready'; offer: PairingOffer; errorMessage: '' }
  | { kind: 'error'; offer: null; errorMessage: string }

export function resolvePairConfirmRouteState(code: string | undefined): PairConfirmRouteState {
  if (!code) {
    return { kind: 'error', offer: null, errorMessage: '缺少配对码' }
  }

  const offer = parsePairingCode(code)
  if (!offer) {
    return { kind: 'error', offer: null, errorMessage: '配对码无效' }
  }

  return { kind: 'ready', offer, errorMessage: '' }
}
