import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@/i18n/i18n'
import zh from '@/i18n/locales/zh.json'
import { matchesSettingsSearch } from './settings-search'
import { getTerminalPaneSearchEntries } from './terminal-search'
import { getBrowserPaneSearchEntries } from './browser-search'
import { getNativeChatExperimentalSearchEntry } from './native-chat-experimental-search-entry'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('new feature settings discovery', () => {
  it('indexes the custom shell on Unix hosts and hides it on Windows hosts', () => {
    for (const isMac of [false, true]) {
      const entries = getTerminalPaneSearchEntries({ isMac, isWindows: false })
      expect(matchesSettingsSearch('fish', entries)).toBe(true)
      expect(matchesSettingsSearch('custom shell', entries)).toBe(true)
    }
    const windows = getTerminalPaneSearchEntries({
      isWindows: false,
      isMac: true,
      isWindowsTerminalHost: true
    })
    expect(windows.some((entry) => entry.title === 'Default terminal shell')).toBe(false)
    expect(windows.some((entry) => entry.title === 'Default Shell')).toBe(true)
  })

  it('finds shell, link clicks and reconnect in Chinese while retaining English aliases', async () => {
    i18n.addResourceBundle('zh', 'translation', zh, true, true)
    await i18n.changeLanguage('zh')
    const terminal = getTerminalPaneSearchEntries({ isWindows: false, isMac: true })
    for (const query of ['默认终端', '自定义 Shell', 'fish', 'custom']) {
      expect(matchesSettingsSearch(query, terminal), query).toBe(true)
    }
    const browser = getBrowserPaneSearchEntries({ isMac: true })
    for (const query of ['中键', '左键', 'middle click', 'left click']) {
      expect(matchesSettingsSearch(query, browser), query).toBe(true)
    }
    for (const query of ['重启', '重连', 'restart', 'reconnect']) {
      expect(matchesSettingsSearch(query, getNativeChatExperimentalSearchEntry()), query).toBe(true)
    }
  })
})
