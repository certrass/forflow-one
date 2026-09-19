import { translate } from '@/i18n/i18n'
import type { AgentSkillSetupPanelProps } from './agent-skill-setup-panel-props'
import { Button } from '../ui/button'
import { IntegrationStatusPill } from '../integration-status-pill'
import { toast } from 'sonner'
import { useState } from 'react'
import { useActiveProjectSkillRuntime } from '@/hooks/useActiveProjectSkillRuntime'
import { installForflowBundledSkills } from './install-forflow-bundled-skills'
import { FORFLOW_BUNDLED_SKILLS } from '../../../../shared/forflow-bundled-skills'

export function ForflowOfflineSkillSetup({
  title,
  description,
  installed,
  loading,
  error,
  onRecheck,
  leading,
  footer,
  preInstallNotice,
  command,
  freshnessSkillName,
  installDisabled
}: AgentSkillSetupPanelProps): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const runtime = useActiveProjectSkillRuntime()
  const names = freshnessSkillName
    ? [freshnessSkillName]
    : [...command.matchAll(/--skill\s+([a-z0-9-]+)/g)].map((match) => match[1])
  const canInstall =
    runtime.canUseLocalSkillFreshness &&
    !installDisabled &&
    names.length > 0 &&
    names.every((name) => Object.hasOwn(FORFLOW_BUNDLED_SKILLS, name))
  const install = async (): Promise<void> => {
    if (busy || !canInstall) {
      return
    }
    setBusy(true)
    try {
      await installForflowBundledSkills(names)
      await onRecheck()
      toast.success(translate('forflow.skills.complete', '内置技能已安装到本机共享目录。'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-2 rounded-md border border-border p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {leading}
      <div className="text-xs text-muted-foreground">{description}</div>
      <IntegrationStatusPill tone={installed ? 'connected' : 'neutral'}>
        {installed
          ? translate('forflow.skills.installed', '已安装')
          : translate('forflow.skills.missing', '尚未检测到')}
      </IntegrationStatusPill>
      <p className="text-xs text-muted-foreground">
        {translate(
          'forflow.skills.offline',
          '将安装包内置技能写入本机 ~/.agents/skills，共其他智能体按其配置读取；已有改动会保留。远程环境由管理员离线分发。'
        )}
      </p>
      {preInstallNotice ? (
        <p className="text-xs text-muted-foreground">
          {translate(
            'forflow.skills.beforeInstall',
            '内置技能直接在本机安装。需要在终端输入 forflow 命令时，可在“通用”设置中注册命令行。'
          )}
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button
        variant="outline"
        size="sm"
        disabled={busy || loading || !canInstall}
        onClick={() => void install()}
      >
        {busy
          ? translate('forflow.skills.settingUp', '正在配置能力…')
          : translate('forflow.skills.installBundled', '安装内置技能（本机）')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => {
          void Promise.resolve()
            .then(onRecheck)
            .catch(() =>
              toast.error(
                translate('forflow.skills.recheckFailed', '检测失败，请检查本机技能目录。')
              )
            )
        }}
      >
        {translate('forflow.skills.recheck', '重新检测本地技能')}
      </Button>
      {footer}
    </section>
  )
}
