import { useEffect, useState } from 'react'
import { translate } from '@/i18n/i18n'
import { SettingsSubsectionHeader } from './SettingsFormControls'

export function ForflowReleaseSettings(): React.JSX.Element {
  const [version, setVersion] = useState('…')
  useEffect(() => {
    let active = true
    void window.api.updater
      .getVersion()
      .then((value) => {
        if (active) {
          setVersion(value)
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])
  return (
    <section className="space-y-3" data-testid="forflow-release">
      <SettingsSubsectionHeader
        title={translate('forflow.release.title', '版本与升级')}
        description={translate('forflow.release.current', '当前版本：{{version}}', { version })}
      />
      <p className="text-sm text-muted-foreground">
        {translate(
          'forflow.release.manual',
          '请使用 Forflow 或企业管理员提供的安装包升级。安装前核对版本、校验值和测试记录，保留上一版安装包以便回退。'
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        {translate(
          'forflow.release.local',
          '此版本为 macOS 本机测试版；不会自动检查、下载或安装上游更新。'
        )}
      </p>
    </section>
  )
}
