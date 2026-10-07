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
import { buildAgentSessionContinuationPrompt } from '../lib/agent-session-continuation'
import { buildAgentSessionForkPrompt } from '../lib/agent-session-fork-context'

describe('Chinese desktop copy at dynamic display boundaries', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh')
  })
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('localizes continuation framing while preserving source paths and task content', () => {
    const source = {
      sourceAgent: 'claude' as const,
      sourceTitle: 'Orca customer project',
      capturedText: '',
      transcriptPath: '/home/Orca/session.jsonl',
      lastPrompt: 'Keep {{name}} and Orca identifiers unchanged'
    }
    const focused = buildAgentSessionContinuationPrompt(source, 'focused')
    const full = buildAgentSessionContinuationPrompt(source, 'full')
    expect(focused).toContain('继续 Forflow One 中的上一项任务')
    expect(focused).toContain('需要补充细节时再读取相关记录')
    expect(focused).toContain('原智能体： claude')
    expect(focused).toContain('Orca customer project')
    expect(focused).toContain(source.lastPrompt)
    expect(full).toContain('请先读取以下路径中的完整会话记录')
    expect(full).toContain(source.transcriptPath)
  })

  it('localizes fork framing without translating the captured transcript', () => {
    const capturedText = 'Orca customer task: preserve {{name}}\n```text\noriginal output\n```'
    const prompt = buildAgentSessionForkPrompt({ capturedText, sourceLabel: 'tab-1:leaf-1' })
    expect(prompt).toContain('从 Forflow One 原有会话派生的新会话')
    expect(prompt).toContain('来源： tab-1:leaf-1')
    expect(prompt).toContain(capturedText)
    expect(prompt).toContain('````text')
    expect(prompt).toContain('等待我的下一项要求')
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
