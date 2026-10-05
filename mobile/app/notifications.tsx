import { StyleSheet, Text } from 'react-native'
import { MobileSettingsFrame } from '../src/settings/mobile-settings-menu'
import { colors, spacing, typography } from '../src/theme/mobile-theme'
export default function NativeNotificationsRoute() {
  return (
    <MobileSettingsFrame title="通知">
      <Text style={styles.body}>
        当前版本通过桌面直连查看任务状态，尚未配置 Forflow One 云推送。请打开应用查看任务进展。
      </Text>
    </MobileSettingsFrame>
  )
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    lineHeight: 22,
    marginBottom: spacing.lg
  }
})
