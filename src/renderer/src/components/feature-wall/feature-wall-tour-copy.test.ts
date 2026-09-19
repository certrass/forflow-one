import { afterEach, expect, it } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { codeBlockHTML } from './editor-animated-visual-markup'
import { localizedDemoCopy } from './feature-wall-demo-copy'
import { FEATURE_WALL_WORKFLOWS } from '../../../../shared/feature-wall-workflows'
import {
  getLocalizedTourWorkflows,
  getLocalizedTourAgents,
  getLocalizedTourWorkbench,
  getLocalizedTourReview
} from './feature-wall-tour-copy'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

it('localizes generated editor content while keeping code examples executable', async () => {
  await i18n.changeLanguage('zh')
  expect(localizedDemoCopy('Ship checklist')).toBe('发布检查清单')
  expect(codeBlockHTML()).toContain('<span>复制</span>')
  expect(codeBlockHTML()).toContain('runSmokeTests')
  expect(codeBlockHTML()).toContain('publish')
  await i18n.changeLanguage('en')
  expect(localizedDemoCopy('Ship checklist')).toBe('Ship checklist')
  expect(codeBlockHTML()).toContain('<span>Copy</span>')
})

it('localizes every workflow and step while preserving IDs, links and optional setup', async () => {
  await i18n.changeLanguage('zh')
  const workflows = getLocalizedTourWorkflows()
  expect(workflows.map((item) => item.id)).toEqual(FEATURE_WALL_WORKFLOWS.map((item) => item.id))
  expect(workflows.map((item) => item.docsUrl)).toEqual(
    FEATURE_WALL_WORKFLOWS.map((item) => item.docsUrl)
  )
  for (const item of workflows) {
    expect(item.title).toMatch(/\p{Script=Han}/u)
    expect(item.lede).toMatch(/\p{Script=Han}/u)
    expect(item.lede).not.toMatch(/\bOrca\b/)
  }
  for (const item of [
    ...getLocalizedTourAgents(),
    ...getLocalizedTourWorkbench(),
    ...getLocalizedTourReview()
  ]) {
    expect(item.name).toMatch(/\p{Script=Han}/u)
    expect(item.subtitle).toMatch(/\p{Script=Han}/u)
    expect(item.description).toMatch(/\p{Script=Han}/u)
  }
  expect(getLocalizedTourAgents().find((item) => item.id === 'usage')?.optional).toBe(true)
  await i18n.changeLanguage('en')
  expect(getLocalizedTourWorkflows()).toEqual(FEATURE_WALL_WORKFLOWS)
})
