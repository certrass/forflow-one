import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '../theme/mobile-theme'
import {
  selectHostWorkspaceListState,
  type HostWorkspaceListStateInput
} from './host-workspace-list-state'

export function HostWorkspaceListStates(
  props: HostWorkspaceListStateInput & {
    search: string
    activeFilterCount: number
  }
) {
  const state = selectHostWorkspaceListState(props)
  if (state === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    )
  }
  if (state === 'catalog-error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>暂时无法读取电脑上的工作区</Text>
        <Text style={styles.catalogErrorDetail}>
          {`正在自动重试，请保持电脑在线。详情：${props.catalogError}`}
        </Text>
      </View>
    )
  }
  if (state === 'empty') {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          {props.search
            ? '没有找到匹配的工作区'
            : props.activeFilterCount > 0
              ? '没有符合筛选条件的工作区'
              : '还没有工作区'}
        </Text>
        {!props.search && props.activeFilterCount === 0 ? (
          <Text style={styles.catalogErrorDetail}>
            点击「＋」新建工作区，或先在电脑端打开一个项目或文件夹。
          </Text>
        ) : null}
      </View>
    )
  }
  return null
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.bodySize
  },
  catalogErrorDetail: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    color: colors.textMuted,
    fontSize: typography.metaSize,
    textAlign: 'center'
  }
})
