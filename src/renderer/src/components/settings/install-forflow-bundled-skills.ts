import { notifyInstalledAgentSkillsChanged } from '@/hooks/useInstalledAgentSkills'
import { translate } from '@/i18n/i18n'

export async function installForflowBundledSkills(names: string[]): Promise<void> {
  if (!window.api.forflowSkills) {
    throw new Error('本版本尚未提供内置技能安装接口。')
  }
  const results = await window.api.forflowSkills.installBundled(names)
  notifyInstalledAgentSkillsChanged()
  const incomplete = results.filter(
    (result) => !['installed', 'updated', 'unchanged'].includes(result.status)
  )
  if (incomplete.length) {
    throw new Error(
      `${translate(
        'forflow.skills.conflict',
        '部分技能未安装，已保留本机现有内容。请检查技能页与安装记录。'
      )} (${incomplete.map((result) => `${result.name}: ${result.status}`).join('、')})`
    )
  }
}
