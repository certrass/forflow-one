import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { i18n } from './i18n'
import { KEYBINDING_DEFINITIONS } from '../../../shared/keybindings'
import { localizedKeybinding } from './keybinding-copy'
import { localizedSlashDescription } from './slash-command-copy'
import slashCopy from './slash-command-copy.json'
import { getShortcutsPaneSearchEntries } from '../components/settings/shortcuts-search'
import {
  formatDownloadFinishedNotice,
  formatPermissionNotice
} from '../components/browser-pane/navigate/browser-notices'
import { formatSummaryStateLabel } from '../components/sidebar/worktree-card-agent-summary'
import { localizedDemoCopy } from '../components/feature-wall/feature-wall-demo-copy'
import { formatAutomationRelativeTime } from '../components/automations/automation-page-parts'

describe('Chinese desktop copy at dynamic display boundaries', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh')
  })
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('localizes every built-in shortcut without changing action IDs, scope or bindings', () => {
    for (const definition of KEYBINDING_DEFINITIONS) {
      const copy = localizedKeybinding(definition)
      expect(copy.title, definition.id).toMatch(/\p{Script=Han}/u)
      expect(copy.group, definition.group).toMatch(/\p{Script=Han}/u)
      expect(copy.id).toBe(definition.id)
      expect(copy.scope).toBe(definition.scope)
      expect(copy.defaultBindings).toEqual(definition.defaultBindings)
    }
    expect(
      getShortcutsPaneSearchEntries().every((entry) => /\p{Script=Han}/u.test(entry.title))
    ).toBe(true)
  })

  it('refreshes shortcut copy when switching language and preserves unknown plugin titles', async () => {
    const definition = KEYBINDING_DEFINITIONS[0]
    expect(localizedKeybinding(definition).title).not.toBe(definition.title)
    await i18n.changeLanguage('en')
    expect(localizedKeybinding(definition).title).toBe(definition.title)
    expect(getShortcutsPaneSearchEntries()[0].title).toBe(definition.title)
  })

  it('localizes built-in slash help and leaves provider content untouched', () => {
    for (const value of Object.keys(slashCopy)) {
      expect(localizedSlashDescription(value), value).toMatch(/\p{Script=Han}/u)
    }
    expect(localizedSlashDescription('Customer-authored command /our-tool')).toBe(
      'Customer-authored command /our-tool'
    )
  })

  it('localizes permissions and downloads while preserving host names and paths', () => {
    const notice = formatPermissionNotice({
      browserPageId: 'page',
      origin: 'https://customer.internal',
      permission: 'media'
    })
    expect(notice).toContain('https://customer.internal')
    expect(notice).toContain('摄像头')
    expect(
      formatDownloadFinishedNotice({
        browserPageId: 'page',
        status: 'completed',
        savePath: '/tmp/Keep My Name.txt',
        downloadId: 'download',
        error: null
      })
    ).toBe('已下载至 /tmp/Keep My Name.txt。')
  })

  it('localizes states, relative times and animated onboarding prompts', () => {
    for (const state of [
      'waiting',
      'blocked',
      'working',
      'monitoring',
      'done',
      'idle',
      'unverifiable',
      'permission',
      'interrupted',
      'failed'
    ] as const) {
      expect(formatSummaryStateLabel(state), state).toMatch(/\p{Script=Han}/u)
    }
    expect(formatAutomationRelativeTime(121000, 1000)).toBe('2分钟后')
    expect(formatAutomationRelativeTime(1000, 121000)).toBe('2分钟前')
    expect(localizedDemoCopy('Make Starter card stand out')).toBe('突出显示入门版卡片')
    expect(localizedDemoCopy('npm test')).toBe('npm test')
  })
})
