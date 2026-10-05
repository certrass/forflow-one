import { StyleSheet, Text, View } from 'react-native'
import { MobileHomeQuickActions } from '../components/MobileHomeQuickActions'
import { colors, spacing, typography } from '../theme/mobile-theme'
import type { HostProfile } from '../transport/types'
import type { HomeResumeCard } from '../worktree/home-resume-card'
import { MobileHomeResumeCard } from './MobileHomeResumeCard'

export function MobileHomeListHeader(props: {
  connectedHosts: HostProfile[]
  resumeCard: HomeResumeCard | null
  onCreateWorkspace: (hostId: string) => void
  onOpenResume: (card: HomeResumeCard) => void
  onPairDesktop: () => void
}) {
  return (
    <View>
      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.heroTitle}>
          工作台
        </Text>
        <Text style={styles.heroSubtitle}>在手机上接着做，工作留在你的电脑上。</Text>
      </View>
      {props.resumeCard ? (
        <>
          <Text accessibilityRole="header" style={styles.sectionHeading}>
            继续上次工作
          </Text>
          <MobileHomeResumeCard card={props.resumeCard} onOpen={props.onOpenResume} />
        </>
      ) : null}
      <MobileHomeQuickActions
        connectedHosts={props.connectedHosts}
        onPairDesktop={props.onPairDesktop}
        onCreateWorkspace={props.onCreateWorkspace}
      />
      <Text accessibilityRole="header" style={[styles.sectionHeading, styles.hostHeading]}>
        我的电脑
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  heroTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    lineHeight: 22,
    marginTop: spacing.sm
  },
  sectionHeading: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    fontWeight: '600',
    marginBottom: spacing.md
  },
  hostHeading: { marginTop: spacing.xl }
})
