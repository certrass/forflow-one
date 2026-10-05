import { ChevronRight, ListTodo } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { TaskProviderLogo } from '../components/TaskProviderLogo'
import type { TaskProvider } from '../tasks/mobile-task-providers'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'

const TASK_PROVIDER_LABELS: Record<TaskProvider, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  linear: 'Linear'
}

export function MobileHomeTasksCard(props: {
  enabled: boolean
  providers: TaskProvider[]
  onOpen: (provider?: TaskProvider) => void
}) {
  const subtitle = !props.enabled
    ? '连接电脑后查看任务列表'
    : props.providers.length > 0
      ? props.providers.map((provider) => TASK_PROVIDER_LABELS[provider]).join(' · ')
      : '在电脑端连接 GitHub、GitLab 或 Linear'
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`任务列表，${subtitle}`}
        accessibilityState={{ disabled: !props.enabled }}
        disabled={!props.enabled}
        style={({ pressed }) => [styles.mainButton, pressed && styles.pressed]}
        onPress={() => props.onOpen()}
      >
        <ListTodo size={20} color={colors.textSecondary} />
        <View style={styles.main}>
          <Text style={styles.title}>任务列表</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {props.enabled ? <ChevronRight size={16} color={colors.textMuted} /> : null}
      </Pressable>
      {props.enabled && props.providers.length > 0 ? (
        <View style={styles.providerRow}>
          {props.providers.map((provider) => (
            <Pressable
              key={provider}
              accessibilityRole="button"
              accessibilityLabel={`查看 ${TASK_PROVIDER_LABELS[provider]} 任务`}
              style={({ pressed }) => [styles.providerButton, pressed && styles.pressed]}
              onPress={() => props.onOpen(provider)}
            >
              <TaskProviderLogo provider={provider} size={18} color={colors.textSecondary} />
              <Text style={styles.providerLabel}>{TASK_PROVIDER_LABELS[provider]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.card,
    overflow: 'hidden'
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    minHeight: 72
  },
  pressed: { backgroundColor: colors.bgRaised },
  main: { flex: 1, minWidth: 0 },
  title: { fontSize: typography.bodySize, fontWeight: '600', color: colors.textPrimary },
  subtitle: {
    fontSize: typography.bodySize,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: spacing.xs
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.button
  },
  providerLabel: { color: colors.textSecondary, fontSize: typography.bodySize }
})
