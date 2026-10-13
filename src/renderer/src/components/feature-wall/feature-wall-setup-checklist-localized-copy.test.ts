import { afterEach, describe, expect, it } from 'vitest'
import { findNodeAtLocation, parseTree } from 'jsonc-parser'
import { FEATURE_WALL_SETUP_STEPS } from '../../../../shared/feature-wall-setup-steps'
import { getLocalizedFeatureWallSetupChecklistCopy } from './feature-wall-setup-checklist-localized-copy'
import en from '../../i18n/locales/en.json'
import ja from '../../i18n/locales/ja.json'
import jaSource from '../../i18n/locales/ja.json?raw'
import ko from '../../i18n/locales/ko.json'
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

  it('defines one Japanese setup checklist catalog without shadowing', () => {
    const catalog = parseTree(jaSource)
    expect(catalog).toBeDefined()
    if (!catalog) {
      throw new Error('Invalid Japanese catalog')
    }
    const featureWall = findNodeAtLocation(catalog, [
      'auto',
      'components',
      'feature',
      'wall',
      'feature',
      'wall'
    ])
    const setupSections = featureWall?.children?.filter(
      (property) => property.children?.[0].value === 'setup'
    )
    expect(setupSections).toHaveLength(1)
  })

  it('returns non-empty localized name and description for all setup checklist steps', () => {
    for (const step of FEATURE_WALL_SETUP_STEPS) {
      const localized = getLocalizedFeatureWallSetupChecklistCopy(step)
      expect(localized.name).toBeTruthy()
      expect(localized.description).toBeTruthy()
    }
  })

  it('has 16 English catalog entries for the setup checklist steps', () => {
    const enKeys = en.auto.components.feature.wall.feature.wall.setup.checklist.localized.copy
    expect(Object.keys(enKeys).length).toBe(16)
    for (const enVal of Object.values(enKeys)) {
      expect(typeof enVal).toBe('string')
    }
  })

  it.each(Object.entries({ ja, ko }))(
    '%s translates every setup checklist step',
    (_locale, catalog) => {
      const enKeys = en.auto.components.feature.wall.feature.wall.setup.checklist.localized.copy
      const localeKeys: Record<string, string> =
        catalog.auto.components.feature.wall.feature.wall.setup.checklist.localized.copy
      expect(Object.keys(localeKeys).length).toBe(16)
      for (const [hash, enVal] of Object.entries(enKeys)) {
        const localeVal = localeKeys[hash]
        expect(typeof localeVal, hash).toBe('string')
        expect(localeVal, hash).toBeTruthy()
        expect(localeVal, hash).not.toBe(enVal)
      }
    }
  )

  it.each(['ja', 'ko'])(
    'resolves every checklist step through the %s runtime catalog',
    async (locale) => {
      try {
        await i18n.changeLanguage(locale)
        for (const step of FEATURE_WALL_SETUP_STEPS) {
          const localized = getLocalizedFeatureWallSetupChecklistCopy(step)
          expect(localized.name, step.id).not.toBe(step.name)
          expect(localized.description, step.id).not.toBe(step.description)
        }
      } finally {
        await i18n.changeLanguage('en')
      }
    }
  )
})
