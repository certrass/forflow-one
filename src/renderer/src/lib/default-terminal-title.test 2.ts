import { afterEach, expect, it } from 'vitest'
import { setRendererUiLanguage } from '@/i18n/i18n'
import { localizeDefaultTerminalTitle } from './default-terminal-title'
import { getWorktreeStatusLabel } from './worktree-status'

afterEach(async () => {
  await setRendererUiLanguage('en')
})
it('localizes generated titles and status without rewriting custom shell output', async () => {
  await setRendererUiLanguage('zh')
  expect(localizeDefaultTerminalTitle('Terminal 2')).toBe('终端 2')
  expect(localizeDefaultTerminalTitle('pnpm test')).toBe('pnpm test')
  expect(getWorktreeStatusLabel('active')).toBe('活动中')
  expect(getWorktreeStatusLabel('permission')).toBe('等待授权')
  await setRendererUiLanguage('en')
  expect(localizeDefaultTerminalTitle('Terminal 2')).toBe('Terminal 2')
  expect(getWorktreeStatusLabel('active')).toBe('Active')
})
