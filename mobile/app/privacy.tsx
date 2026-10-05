import { StyleSheet, Text } from 'react-native'
import { MobileSettingsFrame } from '../src/settings/mobile-settings-menu'
import { colors, spacing, typography } from '../src/theme/mobile-theme'

export default function PrivacyScreen() {
  return (
    <MobileSettingsFrame title="账号与隐私">
      <Text style={styles.heading}>连接你自己的 Forflow One</Text>
      <Text style={styles.body}>
        手机通过 Forflow One 桌面端生成的配对码连接。请在电脑的「设置 →
        手机」中选择本地网络，生成配对码，再用手机扫描或粘贴。
      </Text>
      <Text style={styles.body}>
        配对凭据保存在此应用的独立钥匙串中，连接使用端到端加密。任务、终端和文件仍在配对的电脑上运行；手机和电脑需要处于同一局域网，或通过已有
        VPN 互相访问。
      </Text>
      <Text style={styles.body}>
        Forflow
        企业账号在桌面端管理；手机配对是独立的设备授权，可在桌面设备列表中撤销。此版本不使用云中继、云推送或诊断上传。
      </Text>
    </MobileSettingsFrame>
  )
}

const styles = StyleSheet.create({
  heading: { color: colors.textPrimary, fontSize: typography.titleSize, marginBottom: spacing.md },
  body: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    lineHeight: 22,
    marginBottom: spacing.lg
  }
})
