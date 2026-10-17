import { StyleSheet, Text, View } from 'react-native'
import type { AccountsSnapshot } from '../components/AccountUsage'
import type { HomeStatsSummary } from '../stats/home-stats-total'
import type { TaskProvider } from '../tasks/mobile-task-providers'
import { colors, spacing, typography } from '../theme/mobile-theme'
import type { HostProfile } from '../transport/types'
import { MobileHomeActivitySummary } from './MobileHomeActivitySummary'
import { MobileHomeAccountUsageCards } from './MobileHomeAccountUsageCards'
import { MobileHomeTasksCard } from './MobileHomeTasksCard'

export function MobileHomeListFooter(props: {
  accountsHosts: { host: HostProfile; snapshot: AccountsSnapshot }[]
  primaryHost: HostProfile | null
  primaryTaskProviders: TaskProvider[]
  stats: HomeStatsSummary | null
  onOpenAccounts: (hostId: string) => void
  onOpenTasks: (provider?: TaskProvider) => void
}) {
  return (
    <View>
      <Text accessibilityRole="header" style={styles.sectionHeading}>
        任务来源
      </Text>
      <MobileHomeTasksCard
        enabled={props.primaryHost != null}
        providers={props.primaryTaskProviders}
        onOpen={props.onOpenTasks}
      />
      <MobileHomeAccountUsageCards items={props.accountsHosts} onOpen={props.onOpenAccounts} />
      <MobileHomeActivitySummary stats={props.stats} />
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: typography.bodySize,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    marginBottom: spacing.md
  }
})
