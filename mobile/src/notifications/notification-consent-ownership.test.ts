import { createElement } from 'react'
import { act, create } from 'react-test-renderer'
import { expect, it, vi } from 'vitest'
import NotificationsScreen from '../../app/notifications'
import MobileOnboardingScreen from '../../app/mobile-onboarding'

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  View: 'View'
}))
vi.mock('expo-router', () => ({
  Redirect: 'Redirect',
  useLocalSearchParams: () => ({ hostId: 'host', steps: 'notifications' })
}))
vi.mock('../settings/mobile-settings-menu', () => ({ MobileSettingsFrame: 'SettingsFrame' }))
vi.mock('../components/ForflowLogo', () => ({ ForflowLogo: 'Logo' }))
vi.mock('../onboarding/MobileOnboardingPage', () => ({ MobileOnboardingPage: 'Page' }))
vi.mock('../onboarding/use-reduced-motion', () => ({}))
vi.mock('react-native-safe-area-context', () => ({}))
vi.mock('../session/session-view-opt-in-gate', () => ({}))
vi.mock('../storage/session-view-preferences', () => ({}))
vi.mock('../storage/preferences', () => ({}))
vi.mock('./mobile-notifications', () => ({ ensureNotificationPermissions: vi.fn() }))
vi.mock('./push-registration', () => ({ setRemotePushEnabled: vi.fn() }))

it('explains the unavailable push service without offering an enable switch', async () => {
  const renderer = await act(async () => create(createElement(NotificationsScreen)))
  try {
    expect(JSON.stringify(renderer.toJSON())).toContain('尚未配置 Forflow One 云推送')
    expect(renderer.root.findAllByType('Switch')).toHaveLength(0)
  } finally {
    act(() => renderer.unmount())
  }
})

it('skips a legacy notification onboarding link and preserves the paired host', async () => {
  const renderer = await act(async () => create(createElement(MobileOnboardingScreen)))
  try {
    expect(renderer.root.findByType('Redirect').props.href).toBe('/h/host')
    expect(renderer.root.findAllByType('Page')).toHaveLength(0)
  } finally {
    act(() => renderer.unmount())
  }
})
