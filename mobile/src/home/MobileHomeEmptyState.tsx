import { QrCode } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing } from '../theme/mobile-theme'

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
    title: '连接你的电脑',
    desc: '配对后即可查看任务和会话，连接使用端到端加密。'
  }
]

export function MobileHomeEmptyState(props: {
  bottomInset: number
  contentMaxWidth: number
  isWideLayout: boolean
  onPairDesktop: () => void
}) {
  return (
    <View
      style={[
        styles.emptyContainer,
        { paddingBottom: props.bottomInset },
        props.isWideLayout && {
          maxWidth: props.contentMaxWidth,
          width: '100%',
          alignSelf: 'center'
        }
      ]}
    >
      <View style={styles.emptyHero}>
        <Text style={styles.emptyTitle}>连接你的 Forflow One</Text>
        <Text style={styles.emptyBody}>
          通过局域网或已有 VPN 连接电脑，查看任务、继续对话并操作终端，无需登录云账号。
        </Text>
        <Pressable style={styles.primaryButton} onPress={props.onPairDesktop}>
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
    </View>
  )
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1 },
  emptyHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40
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
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radii.card
  },
  primaryButtonText: { color: colors.bgBase, fontSize: 15, fontWeight: '700' },
  stepsSection: { paddingHorizontal: spacing.xl },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
    backgroundColor: 'rgba(255,255,255,0.04)',
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
  stepDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17 }
})
