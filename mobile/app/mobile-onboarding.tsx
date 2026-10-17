import { useCallback, useMemo, useRef, useState } from 'react'
import { Animated, BackHandler, Text, useWindowDimensions, View } from 'react-native'
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { FORFLOW_MOBILE_REMOTE_PUSH_ENABLED } from '../src/forflow/mobile-connection-policy'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ForflowLogo } from '../src/components/ForflowLogo'
import { ensureNotificationPermissions } from '../src/notifications/mobile-notifications'
import {
  MobileOnboardingPage,
  type MobileOnboardingBusyChoice,
  type NotificationOnboardingChoice
} from '../src/onboarding/MobileOnboardingPage'
import { parseMobileOnboardingSteps } from '../src/onboarding/mobile-onboarding-plan'
import { useReducedMotionEnabled } from '../src/onboarding/use-reduced-motion'
import { mobileOnboardingStyles as styles } from '../src/onboarding/mobile-onboarding-styles'
import {
  saveDefaultSessionView,
  type MobileSessionView
} from '../src/storage/session-view-preferences'
import { setRemotePushEnabled } from '../src/notifications/push-registration'

const SLIDE_DURATION_MS = 280

export default function MobileOnboardingScreen() {
  const params = useLocalSearchParams<{
    hostId?: string | string[]
    steps?: string | string[]
  }>()
  const hostId = firstParam(params.hostId)
  const steps = parseMobileOnboardingSteps(firstParam(params.steps)).filter(
    (step) => FORFLOW_MOBILE_REMOTE_PUSH_ENABLED || step !== 'notifications'
  )
  if (steps.length === 0) {
    return <Redirect href={hostId ? `/h/${hostId}` : '/'} />
  }
  const rawSteps = steps.join(',')

  return (
    <MobileOnboardingFlow
      key={`${hostId ?? 'home'}:${rawSteps ?? 'all'}`}
      hostId={hostId}
      rawSteps={rawSteps}
    />
  )
}

function MobileOnboardingFlow({
  hostId,
  rawSteps
}: {
  hostId: string | undefined
  rawSteps: string | undefined
}) {
  const router = useRouter()
  const steps = useMemo(() => parseMobileOnboardingSteps(rawSteps), [rawSteps])
  const { width } = useWindowDimensions()
  const [activeIndex, setActiveIndex] = useState(0)
  const [busyChoice, setBusyChoice] = useState<MobileOnboardingBusyChoice>(null)
  const [error, setError] = useState<string | null>(null)
  const choiceInFlightRef = useRef(false)
  const slideProgress = useRef(new Animated.Value(0)).current
  const reducedMotionEnabled = useReducedMotionEnabled()

  // Why: onboarding requires an explicit choice for every planned step; disabling
  // stack gestures alone still leaves Android hardware Back able to skip the flow.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true)
      return () => subscription.remove()
    }, [])
  )

  const continueToApp = useCallback(() => {
    router.replace(hostId ? `/h/${hostId}` : '/')
  }, [hostId, router])

  const advanceOrContinue = useCallback(() => {
    const nextIndex = activeIndex + 1
    if (nextIndex >= steps.length) {
      continueToApp()
      return
    }
    setActiveIndex(nextIndex)
    setError(null)
    Animated.timing(slideProgress, {
      toValue: nextIndex,
      // Why: the carousel should preserve continuity without overriding the
      // device's reduced-motion preference.
      duration: reducedMotionEnabled === true ? 0 : SLIDE_DURATION_MS,
      useNativeDriver: true
    }).start(() => {
      // Why: a cancelled cosmetic transition must not leave the next decision
      // permanently disabled after the previous choice was already persisted.
      setBusyChoice(null)
      choiceInFlightRef.current = false
    })
  }, [activeIndex, continueToApp, reducedMotionEnabled, slideProgress, steps.length])

  const chooseSessionView = useCallback(
    async (view: MobileSessionView) => {
      // Why: state does not disable both buttons synchronously; the ref prevents
      // rapid taps from persisting conflicting choices or advancing twice.
      if (choiceInFlightRef.current) {
        return
      }
      choiceInFlightRef.current = true
      setBusyChoice(view)
      setError(null)
      try {
        await saveDefaultSessionView(view)
        advanceOrContinue()
      } catch {
        setError('未能保存选择，请重试。')
        setBusyChoice(null)
        choiceInFlightRef.current = false
      }
    },
    [advanceOrContinue]
  )

  const chooseNotifications = useCallback(
    async (choice: NotificationOnboardingChoice) => {
      if (choiceInFlightRef.current) {
        return
      }
      choiceInFlightRef.current = true
      setBusyChoice(choice)
      setError(null)
      try {
        const enabled = choice === 'enable' ? await ensureNotificationPermissions() : false
        await setRemotePushEnabled(enabled)
        advanceOrContinue()
      } catch {
        setError('未能更新通知设置，请重试。')
        setBusyChoice(null)
        choiceInFlightRef.current = false
      }
    },
    [advanceOrContinue]
  )

  const translateX = useMemo(() => Animated.multiply(slideProgress, -width), [slideProgress, width])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandRow}>
        <ForflowLogo size={22} />
        <Text style={styles.brandName}>Forflow One</Text>
        {steps.length > 1 ? (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="首次使用引导进度"
            accessibilityValue={{ text: `第 ${activeIndex + 1} 步，共 ${steps.length} 步` }}
            style={styles.progress}
          >
            {steps.map((step, index) => (
              <View
                key={step}
                style={[styles.progressDot, index === activeIndex && styles.progressDotActive]}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.carouselViewport}>
        <Animated.View
          style={[
            styles.carouselTrack,
            { width: width * steps.length, transform: [{ translateX }] }
          ]}
        >
          {steps.map((step, index) => (
            <MobileOnboardingPage
              key={step}
              step={step}
              width={width}
              active={index === activeIndex}
              busyChoice={busyChoice}
              error={error}
              onSessionChoice={(view) => void chooseSessionView(view)}
              onNotificationChoice={(choice) => void chooseNotifications(choice)}
            />
          ))}
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
