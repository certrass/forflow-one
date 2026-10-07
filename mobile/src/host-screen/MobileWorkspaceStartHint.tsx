import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '../theme/mobile-theme'

export function MobileWorkspaceStartHint() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        选择工作区，继续工作
      </Text>
      <Text style={styles.body}>打开已有会话，或在工作区内点「＋」选择智能体，开始新任务。</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  title: { color: colors.textPrimary, fontSize: typography.titleSize, fontWeight: '600' },
  body: { color: colors.textSecondary, fontSize: typography.bodySize, lineHeight: 21 }
})
