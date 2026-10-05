import { Buffer } from 'buffer'
import { describe, expect, it } from 'vitest'
import { parsePairingCode } from '../transport/pairing'
import type { HostProfile, PairingOffer } from '../transport/types'
import {
  assertForflowDirectEndpoint,
  assertForflowHostProfile,
  assertForflowPairingOffer
} from './mobile-connection-policy'

const offer: PairingOffer = {
  v: 2,
  endpoint: 'ws://192.168.1.20:6768',
  deviceToken: 'test-device-token',
  publicKeyB64: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
}
const host: HostProfile = { ...offer, id: 'desktop', name: '工作电脑', lastConnected: 1 }

describe('Forflow direct connection policy', () => {
  it.each([
    'ws://192.168.1.20:6768',
    'ws://100.102.47.57:6768',
    'ws://[fd00::1]:6768',
    'wss://desktop.company.example/runtime'
  ])('accepts the user-paired host %s', (endpoint) => {
    expect(() => assertForflowPairingOffer({ ...offer, endpoint })).not.toThrow()
  })

  it.each([
    'wss://relay.onorca.dev/v1/connect/test',
    'wss://RELAY.ONORCA.DEV./v1/connect/test',
    'wss://orca.dev',
    'wss://api.stably.ai',
    'https://desktop.company.example',
    'ws://account:password@192.168.1.20:6768',
    'ws://192.168.1.20:6768#credentials',
    'not a URL'
  ])('refuses an upstream or invalid address %s', (endpoint) => {
    expect(() => assertForflowDirectEndpoint(endpoint)).toThrow()
  })

  it('refuses a saved relay endpoint even when its primary address is local', () => {
    expect(() =>
      assertForflowHostProfile({
        ...host,
        endpoints: [{ id: 'relay', kind: 'relay', url: 'wss://relay.example' }]
      })
    ).toThrow('云中继')
    expect(() =>
      assertForflowHostProfile({
        ...host,
        endpoints: [{ id: 'fallback', kind: 'lan', url: 'wss://relay.onorca.dev' }]
      })
    ).toThrow('Orca')
  })

  it('accepts new and legacy desktop QR codes with UTF-8 endpoint paths', () => {
    const chineseOffer = { ...offer, endpoint: 'wss://desktop.example/研发' }
    const code = Buffer.from(JSON.stringify(chineseOffer)).toString('base64url')
    for (const prefix of ['forflow-one-mobile://pair#', 'orca://pair?code=', '']) {
      const parsed = parsePairingCode(`${prefix}${code}`)
      expect(parsed?.endpoint).toBe(chineseOffer.endpoint)
      expect(parsed?.deviceToken).toBe(offer.deviceToken)
    }
  })
})
