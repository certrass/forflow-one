import { describe, expect, it } from 'vitest'
import i18next from 'i18next'
import { brandProductText, brandTranslationCatalog, getProductIdentity } from './product-branding'

describe('product branding compatibility', () => {
  it('maps product copy while retaining executable examples, URLs and placeholders', () => {
    expect(
      brandProductText('Open Orca: `Orca --help` https://example.test/Orca {{OrcaName}}', true)
    ).toBe('Open Forflow One: `Orca --help` https://example.test/Orca {{OrcaName}}')
    expect(brandProductText('Orcas or Orca', true)).toBe('Orcas or Forflow One')
    expect(brandProductText('ORCA / orca / ORCA_PROFILE', true)).toBe(
      'Forflow One / orca / ORCA_PROFILE'
    )
    expect(brandProductText('Orca', false)).toBe('Orca')
  })

  it('brands the catalog before interpolation without rewriting user content or catalog keys', async () => {
    const source = { OrcaKey: { greeting: 'Orca 打开 {{project}}', help: ['About Orca'] } }
    const catalog = brandTranslationCatalog(source, true)
    const instance = i18next.createInstance()
    await instance.init({ lng: 'zh', resources: { zh: { translation: catalog } } })
    expect(instance.t('OrcaKey.greeting', { project: 'Orca客户项目' })).toBe(
      'Forflow One 打开 Orca客户项目'
    )
    expect(source.OrcaKey.greeting).toBe('Orca 打开 {{project}}')
    expect(brandTranslationCatalog(source, false)).toBe(source)
  })

  it('keeps the two applications independently identifiable', () => {
    expect(getProductIdentity(true).name).toBe('Forflow One')
    expect(getProductIdentity(true).appId).not.toBe(getProductIdentity(false).appId)
    expect(getProductIdentity(true).dataDirectory).not.toBe(getProductIdentity(false).dataDirectory)
  })
})
