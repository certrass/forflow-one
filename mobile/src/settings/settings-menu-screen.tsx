import type { ReactNode } from 'react'
import { Shield, LifeBuoy, Wrench, Info } from 'lucide-react-native'
import { MobileSettingsFrame, MobileSettingsSection } from './mobile-settings-menu'
import { mobileSettingsMenuItems } from './mobile-settings-menu-items'

export default function SettingsMenuScreen({
  push,
  onBack,
  openExternal,
  children
}: {
  push: (route: string) => void
  onBack?: () => void
  openExternal: (url: string) => Promise<unknown>
  children?: ReactNode
}) {
  return (
    <MobileSettingsFrame onBack={onBack}>
      <MobileSettingsSection title="使用偏好" items={mobileSettingsMenuItems(push)} />

      {children}

      <MobileSettingsSection
        spaced
        title="连接与支持"
        items={[
          {
            label: '账号与隐私',
            description: '设备授权、数据与连接方式',
            icon: Shield,
            onPress: () => push('/privacy')
          },
          {
            label: '连接诊断',
            description: '排查手机与电脑的连接问题',
            icon: Wrench,
            onPress: () => push('/troubleshoot')
          },
          {
            label: '问题反馈',
            icon: LifeBuoy,
            external: true,
            onPress: () => void openExternal('https://github.com/certrass/forflow-one/issues')
          },
          { label: '关于', icon: Info, onPress: () => push('/about') }
        ]}
      />
    </MobileSettingsFrame>
  )
}
