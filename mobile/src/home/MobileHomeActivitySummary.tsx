import { StyleSheet, Text, View } from 'react-native'
import type { HomeStatsSummary } from '../stats/home-stats-total'
import { colors, spacing, typography } from '../theme/mobile-theme'

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours} 小时 ${minutes % 60} 分钟` : `${minutes} 分钟`
}

export function MobileHomeActivitySummary({ stats }: { stats: HomeStatsSummary | null }) {
  if (!stats) {
    return null
  }
  const items = [
    ['已启动的智能体', stats.totalAgentsSpawned.toLocaleString()],
    ['智能体累计时长', formatDuration(stats.totalAgentTimeMs)],
    ['已创建的合并请求', stats.totalPRsCreated.toLocaleString()]
  ]
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        累计活动
      </Text>
      {items.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl, gap: spacing.md },
  heading: { color: colors.textSecondary, fontSize: typography.bodySize, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  label: { color: colors.textSecondary, fontSize: typography.bodySize },
  value: { color: colors.textPrimary, fontSize: typography.bodySize }
})
