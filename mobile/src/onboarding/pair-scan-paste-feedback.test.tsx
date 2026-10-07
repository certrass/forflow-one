import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PairScanScreen from '../../app/pair-scan'

const mocks = vi.hoisted(() => ({
  parse: vi.fn(),
  start: vi.fn(),
  permission: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn()
}))
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
  Linking: { openSettings: vi.fn() },
  StyleSheet: { create: (styles: unknown) => styles }
}))
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}))
vi.mock('expo-router', () => ({ useRouter: () => ({ back: vi.fn(), replace: mocks.replace }) }))
vi.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: false, canAskAgain: false }, mocks.permission]
}))
vi.mock('lucide-react-native', () => ({
  ChevronLeft: 'ChevronLeft',
  Clipboard: 'Clipboard',
  QrCode: 'QrCode'
}))
vi.mock('../components/TextInputModal', () => ({ TextInputModal: 'TextInputModal' }))
vi.mock('../components/ConnectionLog', () => ({ ConnectionLog: 'ConnectionLog' }))
vi.mock('../transport/pairing', () => ({
  decodePairingUrl: mocks.parse,
  parsePairingCode: mocks.parse
}))
vi.mock('../transport/pre-profile-pairing-coordinator', () => ({
  startPreProfilePairing: mocks.start
}))
vi.mock('../transport/client-context', () => ({ useRefreshHostClient: () => mocks.refresh }))
vi.mock('./mobile-onboarding-plan', () => ({
  loadMobileOnboardingSteps: async () => ['session-view'],
  mobileOnboardingDestination: () => '/mobile-onboarding'
}))

describe('pasted pairing without camera permission', () => {
  let renderer: ReactTestRenderer | null = null
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    act(() => renderer?.unmount())
  })

  async function paste() {
    await act(async () => {
      renderer = create(createElement(PairScanScreen), { createNodeMock: () => ({}) })
    })
    const modal = renderer?.root.findByProps({ title: '粘贴配对码' })
    await act(async () => {
      modal?.props.onSubmit('test-code')
    })
  }

  it('shows invalid-code feedback even when camera permission is denied', async () => {
    mocks.parse.mockReturnValue(null)
    await paste()
    expect(JSON.stringify(renderer?.toJSON())).toContain('配对码无效，请从电脑重新复制后粘贴')
    expect(mocks.start).not.toHaveBeenCalled()
    expect(mocks.permission).not.toHaveBeenCalled()
  })

  it('shows progress and routes a successful pasted pairing to onboarding', async () => {
    let resolve!: (result: { hostId: string }) => void
    const result = new Promise<{ hostId: string }>((done) => {
      resolve = done
    })
    mocks.parse.mockReturnValue({ hostId: 'test-host' })
    mocks.start.mockReturnValue({ result, dispose: vi.fn(), timedOut: false })
    await paste()
    expect(JSON.stringify(renderer?.toJSON())).toContain('正在连接…')
    expect(mocks.replace).not.toHaveBeenCalled()
    await act(async () => {
      resolve({ hostId: 'test-host' })
    })
    expect(mocks.refresh).toHaveBeenCalledWith('test-host')
    expect(mocks.replace).toHaveBeenCalledWith('/mobile-onboarding')
    expect(mocks.permission).not.toHaveBeenCalled()
  })
})
