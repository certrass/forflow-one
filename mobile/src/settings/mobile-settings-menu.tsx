import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowUpRight, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'

export function MobileSettingsFrame({
  children,
  onBack,
  title = '设置'
}: {
  children: ReactNode
  onBack?: () => void
  title?: string
}) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          style={styles.backButton}
          onPress={onBack ?? (() => router.back())}
        >
          <ChevronLeft size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.heading}>{title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  )
}

export type MobileSettingsMenuItem = {
  label: string
  description?: string
  icon: LucideIcon
  onPress: () => void
  external?: boolean
  disabled?: boolean
}

export function MobileSettingsSection({
  items,
  spaced = false,
  title
}: {
  items: MobileSettingsMenuItem[]
  spaced?: boolean
  title?: string
}) {
  return (
    <View style={spaced && styles.sectionSpacer}>
      {title ? (
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
      ) : null}
      <View style={styles.section}>
        {items.map(({ label, description, icon: Icon, onPress, external, disabled }, index) => (
          <View key={label}>
            {index > 0 && <View style={styles.separator} />}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={description}
              accessibilityState={{ disabled: Boolean(disabled) }}
              disabled={disabled}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={onPress}
            >
              <Icon size={16} color={colors.textSecondary} />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{label}</Text>
                {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
              </View>
              {external ? (
                <ArrowUpRight size={16} color={colors.textMuted} />
              ) : (
                <ChevronRight size={16} color={colors.textMuted} />
              )}
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase, paddingHorizontal: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  heading: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  section: { backgroundColor: colors.bgPanel, borderRadius: radii.card, overflow: 'hidden' },
  sectionSpacer: { marginTop: spacing.xl },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    fontWeight: '600',
    marginBottom: spacing.md
  },
  row: {
    flexDirection: 'row',
    minHeight: 52,
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2
  },
  rowPressed: { backgroundColor: colors.bgRaised },
  rowContent: { flex: 1, gap: spacing.xs },
  rowDescription: { fontSize: typography.metaSize, lineHeight: 18, color: colors.textSecondary },
  rowLabel: {
    fontSize: typography.bodySize,
    fontWeight: '500',
    color: colors.textPrimary
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.md
  }
})
