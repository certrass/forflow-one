import { describe, expect, it, vi } from 'vitest'
import { readPushNotificationsPreference } from '../storage/preferences'
import { shouldPresentNotificationOptIn } from './notification-opt-in-gate'

vi.mock('../storage/preferences', () => ({
  readPushNotificationsPreference: vi.fn()
}))

describe('notification opt-in gate', () => {
  it('does not offer unconfigured cloud push even without a saved preference', async () => {
    vi.mocked(readPushNotificationsPreference).mockResolvedValue({ value: null, loaded: true })
    await expect(shouldPresentNotificationOptIn()).resolves.toBe(false)
  })

  it.each([true, false])('does not ask again after choosing %s', async (value) => {
    vi.mocked(readPushNotificationsPreference).mockResolvedValue({ value, loaded: true })
    await expect(shouldPresentNotificationOptIn()).resolves.toBe(false)
  })

  it('does not prompt when the saved choice cannot be read', async () => {
    vi.mocked(readPushNotificationsPreference).mockResolvedValue({ value: null, loaded: false })
    await expect(shouldPresentNotificationOptIn()).resolves.toBe(false)
  })
})
