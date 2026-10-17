import { StyleSheet, Text, View } from 'react-native'
import { MobileSettingsFrame } from '../src/settings/mobile-settings-menu'
import { colors, spacing, typography } from '../src/theme/mobile-theme'

const PRIVACY_SECTIONS = [
  {
    title: '设备授权',
    body: '在电脑的「设置 → 手机」中选择本地网络，生成配对码，再用手机扫描或粘贴。手机配对是独立的设备授权，可在桌面设备列表撤销。Forflow 企业账号在桌面端管理。'
  },
  {
    title: '数据与加密',
    body: '配对凭据保存在此应用的独立钥匙串中，连接使用端到端加密。任务、终端和文件操作由配对的电脑执行。'
  },
  {
    title: '连接方式',
    body: '手机和电脑需要处于同一局域网，或通过已有 VPN 互相访问。此版本不使用云中继、云推送或诊断上传。'
  }
]

export default function PrivacyScreen() {
  return (
    <MobileSettingsFrame title="账号与隐私">
      <Text style={styles.intro}>连接你自己的 Forflow One</Text>
      {PRIVACY_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>
            {section.title}
          </Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
    </MobileSettingsFrame>
  )
}

const styles = StyleSheet.create({
  intro: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    lineHeight: 22,
    marginBottom: spacing.xl
  },
  section: {
    paddingBottom: spacing.xl,
    marginBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.titleSize,
    fontWeight: '600',
    marginBottom: spacing.md
  },
  body: { color: colors.textSecondary, fontSize: typography.bodySize, lineHeight: 24 }
})
