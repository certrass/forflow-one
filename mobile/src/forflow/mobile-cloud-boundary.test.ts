import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Notifications from 'expo-notifications'
import { addPushTokenListener, getDevicePushToken } from '../notifications/push-token'
import { setRemotePushEnabled, startPushTokenSync } from '../notifications/push-registration'
import { shouldPresentNotificationOptIn } from '../notifications/notification-opt-in-gate'
import { recoverMobileRelayPairing } from '../transport/mobile-relay-pairing-recovery'
import { startPreProfilePairing } from '../transport/pre-profile-pairing-coordinator'
import { submitConnectionDiagnostics } from '../diagnostics/connection-diagnostics-submission'
import type { PairingOffer } from '../transport/types'

vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, AppState: {} }))
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }))
vi.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED' }))
vi.mock('expo-crypto', () => ({ getRandomBytes: vi.fn() }))
vi.mock('expo-notifications', () => ({
  getDevicePushTokenAsync: vi.fn(),
  addPushTokenListener: vi.fn()
}))

beforeEach(() => vi.clearAllMocks())

describe('Forflow production defaults prevent cloud side effects', () => {
  it('does not request a push token, install a listener, or offer push consent', async () => {
    startPushTokenSync()()
    addPushTokenListener(vi.fn())()
    await expect(getDevicePushToken()).resolves.toBeNull()
    await expect(shouldPresentNotificationOptIn()).resolves.toBe(false)
    await expect(setRemotePushEnabled(true)).rejects.toThrow('Forflow One')
    expect(Notifications.getDevicePushTokenAsync).not.toHaveBeenCalled()
    expect(Notifications.addPushTokenListener).not.toHaveBeenCalled()
  })

  it('does not recover cloud credentials or upload a diagnostic report', async () => {
    const loadJournal = vi.fn()
    const connectRelay = vi.fn()
    await expect(recoverMobileRelayPairing({ loadJournal, connectRelay })).resolves.toBe('none')
    expect(loadJournal).not.toHaveBeenCalled()
    expect(connectRelay).not.toHaveBeenCalled()
    const fetchImpl = vi.fn(async () => {
      throw new Error('Diagnostics must not make a network request')
    })
    await expect(
      submitConnectionDiagnostics(
        { report: 'private report', appVersion: '0.1.0', platform: 'ios' },
        fetchImpl
      )
    ).resolves.toMatchObject({ ok: false })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects a cloud pairing offer before resolving identity, dialing, or saving', async () => {
    const offer: PairingOffer = {
      v: 2,
      endpoint: 'ws://192.168.1.20:6768',
      deviceToken: 'device-token',
      publicKeyB64: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      relay: {
        v: 1,
        directorUrl: 'https://relay.onorca.dev',
        cellUrl: 'https://relay-c1.onorca.dev',
        assignmentEpoch: 1,
        relayHostId: 'AbCdEf0123_-xyZ9',
        inviteToken: 'a'.repeat(43),
        inviteExpiresAt: Date.now() + 60_000,
        e2eeFraming: 2
      }
    }
    const dependencies = {
      connectDirect: vi.fn(),
      connectRelay: vi.fn(),
      resolveHostIdentity: vi.fn(),
      saveHost: vi.fn(),
      saveJournal: vi.fn()
    }
    const attempt = startPreProfilePairing({ offer, timeoutMs: 1_000, dependencies })
    await expect(attempt.result).rejects.toThrow('云中继')
    for (const dependency of Object.values(dependencies)) {
      expect(dependency).not.toHaveBeenCalled()
    }
    attempt.dispose()
  })
})
