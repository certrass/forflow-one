import { readPushNotificationsPreference } from '../storage/preferences'
import { FORFLOW_MOBILE_REMOTE_PUSH_ENABLED } from '../forflow/mobile-connection-policy'

export async function shouldPresentNotificationOptIn(): Promise<boolean> {
  if (!FORFLOW_MOBILE_REMOTE_PUSH_ENABLED) {
    return false
  }
  const preference = await readPushNotificationsPreference()
  return preference.loaded && preference.value === null
}
