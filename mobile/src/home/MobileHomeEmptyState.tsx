import { QrCode } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'

const ONBOARDING_STEPS = [
  {
    title: '打开 Forflow One 桌面端',
    desc: '进入「设置 → 手机」，选择本地网络并生成配对码。'
  },
  {
    title: '扫描配对码',
    desc: '使用上方按钮扫描电脑上的二维码，也可以粘贴配对码。'
  },
  {
    title: '选择工作区，开始对话',
    desc: '配对后打开工作区，选择智能体并发送任务，也可以继续已有会话。'
  }
]

export function MobileHomeEmptyState(props: {
  bottomInset: number
  contentMaxWidth: number
  isWideLayout: boolean
  onPairDesktop: () => void
}) {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.emptyContainer,
        { paddingBottom: props.bottomInset + spacing.xl },
        props.isWideLayout && {
          maxWidth: props.contentMaxWidth,
          width: '100%',
          alignSelf: 'center'
        }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.emptyHero}>
        <Text style={styles.emptyTitle}>在手机上继续工作</Text>
        <Text style={styles.emptyBody}>
          连接电脑上的 Forflow
          One，继续智能体对话、查看任务进展。请让手机和电脑处于同一局域网，或通过已有 VPN 互通。
        </Text>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={props.onPairDesktop}
        >
          <QrCode size={17} color={colors.bgBase} />
          <Text style={styles.primaryButtonText}>配对桌面端</Text>
        </Pressable>
      </View>
      <View style={styles.stepsSection}>
        <Text style={styles.sectionHeading}>开始连接</Text>
        {ONBOARDING_STEPS.map((step, index) => (
          <View key={step.title} style={[styles.stepRow, index > 0 && styles.stepRowBorder]}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{index + 1}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  emptyContainer: { flexGrow: 1 },
  emptyHero: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10
  },
  emptyBody: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceBright,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radii.card
  },
  primaryButtonText: { color: colors.bgBase, fontSize: 15, fontWeight: '700' },
  stepsSection: { paddingHorizontal: spacing.xl },
  sectionHeading: {
    fontSize: typography.bodySize,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: spacing.lg
  },
  stepRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.bgRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1
  },
  stepNumText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  stepText: { flex: 1 },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 3
  },
  stepDesc: { fontSize: typography.bodySize, color: colors.textSecondary, lineHeight: 22 }
})
