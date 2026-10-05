import { expect, it, vi } from 'vitest'
import { loadStoredHostProfiles } from '../transport/host-metadata-store'
import { readPairingKeychainItem } from '../transport/pairing-keychain'

const storage = vi.hoisted(() => ({
  getItem: vi.fn(async (key: string) =>
    key === 'orca:hosts' ? JSON.stringify([{ id: 'upstream-desktop' }]) : null
  ),
  getSecret: vi.fn(async (_key: string, options?: { keychainService?: string }) =>
    options?.keychainService?.startsWith('cn.forflow.one.mobile.pairing.')
      ? null
      : 'upstream-account-secret'
  )
}))
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: storage.getItem }
}))
vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED',
  getItemAsync: storage.getSecret
}))

it('never adopts the upstream host list or default keychain secrets', async () => {
  await expect(loadStoredHostProfiles()).resolves.toEqual([])
  await expect(readPairingKeychainItem('forflow-one.host-token.desktop')).resolves.toBeNull()
  expect(storage.getItem).not.toHaveBeenCalledWith('orca:hosts')
  expect(storage.getSecret).toHaveBeenCalledExactlyOnceWith('forflow-one.host-token.desktop', {
    keychainAccessible: 'WHEN_UNLOCKED',
    keychainService: 'cn.forflow.one.mobile.pairing.v0'
  })
})
