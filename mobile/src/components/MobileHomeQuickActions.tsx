import { useRef, useState } from 'react'
import { Plus, QrCode } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { HostProfile } from '../transport/types'
import { hostEndpointLabel } from '../transport/host-endpoint-label'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'
import { PickerModal } from './PickerModal'

type Props = {
  connectedHosts: HostProfile[]
  onPairDesktop: () => void
  onCreateWorkspace: (hostId: string) => void
}

function hostPickerOptions(hosts: HostProfile[]) {
  const entries = hosts.map((host) => ({
    host,
    endpointLabel: hostEndpointLabel(host.endpoint)
  }))
  const endpointCounts = new Map<string, number>()
  for (const entry of entries) {
    const endpointKey = JSON.stringify([entry.host.name, entry.endpointLabel])
    endpointCounts.set(endpointKey, (endpointCounts.get(endpointKey) ?? 0) + 1)
  }
  return entries.map((entry) => {
    const endpointKey = JSON.stringify([entry.host.name, entry.endpointLabel])
    const endpointCollides = (endpointCounts.get(endpointKey) ?? 0) > 1
    const subtitle = endpointCollides
      ? `${entry.endpointLabel} · ${entry.host.id}`
      : entry.endpointLabel
    return { value: entry.host.id, label: entry.host.name, subtitle }
  })
}

export function MobileHomeQuickActions(props: Props) {
  const [hostPickerForHostSet, setHostPickerForHostSet] = useState<string | null>(null)
  const pendingHostIdRef = useRef<string | null>(null)
  const canCreateWorkspace = props.connectedHosts.length > 0
  const hostSetKey = JSON.stringify(props.connectedHosts.map((host) => host.id))
  const hostPickerVisible = hostPickerForHostSet === hostSetKey
  if (hostPickerForHostSet !== null && !hostPickerVisible) {
    setHostPickerForHostSet(null)
  }

  function handleCreateWorkspace() {
    if (props.connectedHosts.length === 1) {
      props.onCreateWorkspace(props.connectedHosts[0].id)
      return
    }
    if (props.connectedHosts.length > 1) {
      setHostPickerForHostSet(hostSetKey)
    }
  }

  function handleHostSelect(hostId: string) {
    pendingHostIdRef.current = hostId
    setHostPickerForHostSet(null)
  }

  function handleHostPickerClosed() {
    setHostPickerForHostSet(null)
    const hostId = pendingHostIdRef.current
    pendingHostIdRef.current = null
    if (hostId && props.connectedHosts.some((host) => host.id === hostId)) {
      props.onCreateWorkspace(hostId)
    }
  }

  return (
    <>
      <View style={styles.quickActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="配对电脑"
          style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
          onPress={props.onPairDesktop}
        >
          <View style={styles.quickActionIcon}>
            <QrCode size={16} color={colors.textSecondary} />
          </View>
          <Text style={styles.quickActionLabel}>配对电脑</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canCreateWorkspace }}
          accessibilityLabel="新建工作区"
          accessibilityHint={!canCreateWorkspace ? '连接电脑后可新建工作区' : undefined}
          disabled={!canCreateWorkspace}
          style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
          onPress={handleCreateWorkspace}
        >
          <View style={styles.quickActionIcon}>
            <Plus size={16} color={colors.textSecondary} />
          </View>
          <Text style={styles.quickActionLabel}>
            {canCreateWorkspace ? '新建工作区' : '连接后可新建'}
          </Text>
        </Pressable>
      </View>
      <PickerModal
        visible={hostPickerVisible}
        title="选择工作区所在电脑"
        options={hostPickerOptions(props.connectedHosts)}
        selected=""
        onSelect={handleHostSelect}
        onClose={() => setHostPickerForHostSet(null)}
        onAfterClose={handleHostPickerClosed}
      />
    </>
  )
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  quickAction: {
    flex: 1,
    minWidth: 140,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.card,
    backgroundColor: colors.bgPanel
  },
  quickActionPressed: {
    backgroundColor: colors.bgRaised
  },
  quickActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRaised
  },
  quickActionLabel: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    flexShrink: 1,
    fontWeight: '600'
  }
})
