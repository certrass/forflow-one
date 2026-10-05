import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ClaudeIcon, OpenAIIcon } from '../components/AgentIcons'
import {
  getActiveProviderRateLimits,
  getUsageBarState,
  hasActiveProviderUsage,
  UsageBar,
  type AccountsSnapshot,
  type ProviderKey
} from '../components/AccountUsage'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'
import type { HostProfile } from '../transport/types'

export function MobileHomeAccountUsageCards(props: {
  items: { host: HostProfile; snapshot: AccountsSnapshot }[]
  onOpen: (hostId: string) => void
}) {
  if (props.items.length === 0) {
    return null
  }
  return (
    <>
      <Text style={styles.sectionHeading}>模型账号用量</Text>
      {props.items.map(({ host, snapshot }) => {
        const claudeActive =
          snapshot.claude.accounts.find(
            (account) => account.id === snapshot.claude.activeAccountId
          ) ?? null
        const codexActive =
          snapshot.codex.accounts.find(
            (account) => account.id === snapshot.codex.activeAccountId
          ) ?? null
        return (
          <Pressable
            key={host.id}
            accessibilityRole="button"
            accessibilityLabel={`查看 ${host.name} 的模型账号用量`}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => props.onOpen(host.id)}
          >
            {props.items.length > 1 ? (
              <Text style={styles.hostLabel} numberOfLines={1}>
                {host.name}
              </Text>
            ) : null}
            {(['claude', 'codex'] as ProviderKey[]).map((provider) => {
              const active = provider === 'claude' ? claudeActive : codexActive
              const accounts =
                provider === 'claude' ? snapshot.claude.accounts : snapshot.codex.accounts
              const limits = getActiveProviderRateLimits(snapshot, provider)
              if (accounts.length === 0 && !hasActiveProviderUsage(limits)) {
                return null
              }
              const sessionBar = getUsageBarState(limits, 'session')
              const weeklyBar = getUsageBarState(limits, 'weekly')
              return (
                <View key={provider} style={styles.row}>
                  <View style={styles.icon}>
                    {provider === 'claude' ? (
                      <ClaudeIcon size={18} />
                    ) : (
                      <OpenAIIcon size={18} color={colors.textPrimary} />
                    )}
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.email} numberOfLines={1}>
                      {active?.email ?? '系统默认账号'}
                    </Text>
                    <View style={styles.bars}>
                      <UsageBar
                        label="5h"
                        usedPercent={sessionBar.usedPercent}
                        unavailable={sessionBar.unavailable}
                        loading={sessionBar.loading}
                      />
                      <UsageBar
                        label="7d"
                        usedPercent={weeklyBar.usedPercent}
                        unavailable={weeklyBar.unavailable}
                        loading={weeklyBar.loading}
                      />
                    </View>
                  </View>
                </View>
              )
            })}
          </Pressable>
        )
      })}
    </>
  )
}

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: typography.bodySize,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs
  },
  card: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  cardPressed: { backgroundColor: colors.bgRaised },
  hostLabel: {
    fontSize: typography.bodySize,
    color: colors.textMuted,
    fontWeight: '500'
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.bgRaised,
    alignItems: 'center',
    justifyContent: 'center'
  },
  info: { flex: 1, minWidth: 0, gap: 2 },
  email: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  bars: { flexDirection: 'row', gap: spacing.md, marginTop: 4 }
})
