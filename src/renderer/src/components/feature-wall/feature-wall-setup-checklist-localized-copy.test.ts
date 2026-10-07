import { afterEach, describe, expect, it } from 'vitest'
import { FEATURE_WALL_SETUP_STEPS } from '../../../../shared/feature-wall-setup-steps'
import { getLocalizedFeatureWallSetupChecklistCopy } from './feature-wall-setup-checklist-localized-copy'
import ko from '../../i18n/locales/ko.json'
import en from '../../i18n/locales/en.json'
import { i18n } from '../../i18n/i18n'

describe('feature-wall-setup-checklist-localized-copy', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('refreshes all cached English titles and descriptions when Chinese loads', async () => {
    await i18n.changeLanguage('en')
    FEATURE_WALL_SETUP_STEPS.forEach(getLocalizedFeatureWallSetupChecklistCopy)
    await i18n.changeLanguage('zh')
    const names = FEATURE_WALL_SETUP_STEPS.map((step) => {
      const copy = getLocalizedFeatureWallSetupChecklistCopy(step)
      expect(copy.description).toMatch(/\p{Script=Han}/u)
      expect(copy.description).not.toBe(step.description)
      return copy.name
    })
    expect(names).toEqual([
      '同时处理两项任务',
      '使用 Orca 浏览器',
      '开启通知',
      '选择默认智能体',
      '为智能体提供 Orca 技能',
      '连接集成服务',
      '自动配置工作区',
      '在多个仓库中开始工作'
    ])
  })

  it('returns non-empty localized name and description for all setup checklist steps', () => {
    for (const step of FEATURE_WALL_SETUP_STEPS) {
      const localized = getLocalizedFeatureWallSetupChecklistCopy(step)
      expect(localized.name).toBeTruthy()
      expect(localized.description).toBeTruthy()
    }
  })

  it('has valid Korean and English catalog entries for all setup checklist steps', () => {
    const enKeys = en.auto.components.feature.wall.feature.wall.setup.checklist.localized.copy
    const koKeys = ko.auto.components.feature.wall.feature.wall.setup.checklist.localized.copy
    expect(Object.keys(enKeys).length).toBe(16)
    expect(Object.keys(koKeys).length).toBe(16)
    for (const [hash, enVal] of Object.entries(enKeys)) {
      expect(typeof enVal).toBe('string')
      expect((koKeys as Record<string, string>)[hash]).toBeTruthy()
    }
  })
})
