import { ArrowUpRight } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'
import type { HomeResumeCard } from '../worktree/home-resume-card'

export function MobileHomeResumeCard(props: {
  card: HomeResumeCard
  onOpen: (card: HomeResumeCard) => void
}) {
  const { worktree, actionable } = props.card
  const actionLabel = actionable ? '继续工作' : '连接电脑后继续'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${actionLabel}，${worktree.displayName}，${worktree.repo}`}
      accessibilityState={{ disabled: !actionable }}
      disabled={!actionable}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => props.onOpen(props.card)}
    >
      <Text style={styles.title} numberOfLines={2}>
        {worktree.displayName}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {worktree.repo}
        {worktree.branch ? ` · ${worktree.branch}` : ''}
      </Text>
      <View style={styles.actionRow}>
        <View style={[styles.action, actionable && styles.actionReady]}>
          <Text style={[styles.actionText, actionable && styles.actionTextReady]}>
            {actionLabel}
          </Text>
          {actionable ? <ArrowUpRight size={16} color={colors.bgBase} /> : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardPressed: { backgroundColor: colors.bgRaised },
  title: {
    fontSize: typography.titleSize,
    lineHeight: 26,
    fontWeight: '600',
    color: colors.textPrimary
  },
  subtitle: { fontSize: typography.bodySize, lineHeight: 22, color: colors.textSecondary },
  actionRow: { flexDirection: 'row', marginTop: spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgRaised
  },
  actionReady: { backgroundColor: colors.surfaceBright },
  actionText: { fontSize: typography.bodySize, fontWeight: '600', color: colors.textSecondary },
  actionTextReady: { color: colors.bgBase }
})
