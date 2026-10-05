import type { ReactNode } from 'react'
import { Shield, LifeBuoy } from 'lucide-react-native'
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
      <MobileSettingsSection items={mobileSettingsMenuItems(push)} />

      {children}

      <MobileSettingsSection
        spaced
        items={[
          {
            label: '账号与隐私',
            icon: Shield,
            onPress: () => push('/privacy')
          },
          {
            label: '问题反馈',
            icon: LifeBuoy,
            external: true,
            onPress: () => void openExternal('https://github.com/certrass/forflow-one/issues')
          }
        ]}
      />
    </MobileSettingsFrame>
  )
}
