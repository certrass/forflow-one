import { describe, expect, it, afterEach } from 'vitest'
import { i18n, setRendererUiLanguage, translate } from '@/i18n/i18n'
import { getDefaultSettings } from '../../../../shared/constants'
import { resolveSourceControlAiForOperation } from '../../../../shared/source-control-ai'
import { getSourceControlActionAgentWarningText } from './source-control-action-recipe-options'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('Source Control AI with a companion as chat default', () => {
  it.each(['aily', 'workbuddy'] as const)(
    'explains the inherited %s choice in Chinese',
    async (agent) => {
      await setRendererUiLanguage('zh')
      const settings = getDefaultSettings('/tmp')
      settings.defaultTuiAgent = agent
      const result = resolveSourceControlAiForOperation({
        settings,
        operation: 'branchName',
        translateError: translate
      })
      expect(result).toEqual({
        ok: false,
        error:
          '默认智能体暂不支持 Git 自动生成。请到「设置 → Git → 源代码管理 AI」选择 Codex 或其他可用智能体。'
      })
      expect(getSourceControlActionAgentWarningText('branchName', null, agent)).toContain(
        '聊天仍使用当前默认值'
      )
      expect(getSourceControlActionAgentWarningText('fixChecks', null, agent)).toBeNull()
    }
  )

  it.each(['commitMessage', 'branchName', 'pullRequest'] as const)(
    'keeps the chat choice when %s uses Codex',
    (operation) => {
      const settings = getDefaultSettings('/tmp')
      settings.defaultTuiAgent = 'aily'
      settings.sourceControlAi!.actions![operation] = {
        ...settings.sourceControlAi!.actions![operation],
        agentId: 'codex'
      }
      const result = resolveSourceControlAiForOperation({ settings, operation })
      expect(result).toMatchObject({ ok: true, value: { params: { agentId: 'codex' } } })
      expect(settings.defaultTuiAgent).toBe('aily')
      expect(getSourceControlActionAgentWarningText(operation, 'codex', 'aily')).toBeNull()
    }
  )
})
