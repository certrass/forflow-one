import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'

const STARTERS = [
  {
    label: '了解这个工作区',
    text: '请先查看这个工作区，概括主要内容和当前进展，暂时不要修改文件。'
  },
  {
    label: '梳理下一步',
    text: '请查看这个工作区，建议接下来最值得做的三件事，并说明理由，暂时不要修改文件。'
  }
]

export function MobileChatStarterPrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <View style={styles.list}>
      <Text style={styles.hint}>选一个示例，修改后再发送</Text>
      {STARTERS.map((starter) => (
        <Pressable
          key={starter.label}
          accessibilityRole="button"
          accessibilityHint="填入输入框，修改后点击发送"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => onPick(starter.text)}
        >
          <Text style={styles.label}>{starter.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: 420, gap: spacing.sm, marginTop: spacing.lg },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.button,
    backgroundColor: colors.bgRaised
  },
  pressed: { backgroundColor: colors.bgPanel },
  hint: { color: colors.textSecondary, fontSize: typography.metaSize, textAlign: 'center' },
  label: { color: colors.textPrimary, fontSize: typography.bodySize, textAlign: 'center' }
})
