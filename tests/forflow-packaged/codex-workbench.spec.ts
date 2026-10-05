import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createChatProviderFixture } from './chat-provider-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('Codex GUI: multiline input, follow-up, stop, same session and split ownership', async () => {
  const profile = privateProfile('codex-workbench')
  const fixture = createChatProviderFixture(profile, 'codex')
  const { app, page, errors } = await launch(profile)
  const ledger = () => readFileSync(fixture.ledger, 'utf8')
  try {
    await addPrivateProject(page, profile)
    const toolbar = page.locator('[data-forflow-session-toolbar]:visible').first()
    const pane = page.locator('.pane[data-pty-id]:visible').first()
    await expect(pane).toBeVisible()
    const ptyId = await pane.getAttribute('data-pty-id')
    const leafId = await pane.getAttribute('data-leaf-id')
    if (!ptyId || !leafId) {
      throw new Error('Missing pane identity')
    }
    await page.evaluate(({ ptyId, command }) => window.api.pty.write(ptyId, command, 'driving'), {
      ptyId,
      command: fixture.command
    })
    await expect.poll(ledger).toContain('"type":"start"')
    await expect(toolbar.getByRole('button', { name: '对话', exact: true })).toBeEnabled()
    await toolbar.getByRole('button', { name: '对话', exact: true }).click()
    await expect(toolbar).toContainText('Codex')
    await expect(
      page.getByText('已连接原会话，可在对话与终端间切换。', { exact: true })
    ).toBeVisible()
    const chat = page.locator('.native-chat-pane-shell')
    const composer = chat.locator('[contenteditable="true"]').first()
    await composer.fill('请检查这份资料')
    await composer.press('Shift+Enter')
    await composer.pressSequentially('并保留原始结论')
    await expect(composer).toContainText('并保留原始结论')
    expect(ledger()).not.toContain('"type":"input"')
    await toolbar.getByRole('button', { name: '文件', exact: true }).click()
    const file = page.locator('[data-file-explorer-row]').filter({ hasText: 'README.md' }).first()
    await file.dragTo(composer)
    await expect(composer.locator('[data-native-chat-file-reference]')).toHaveCount(1)
    const notice = page.locator('[data-sonner-toast]').filter({
      hasText: 'Codex 现在使用独立服务运行'
    })
    await notice.getByRole('button', { name: 'Close toast', exact: true }).click()
    await expect(notice).toHaveCount(0)
    await chat.getByRole('button', { name: '发送', exact: true }).click()
    await expect.poll(ledger).toContain('并保留原始结论')
    const followUp = chat.getByRole('button', { name: '补充消息', exact: true })
    await expect(followUp).toBeDisabled()
    await composer.fill('补充：只处理 README')
    await expect(followUp).toBeEnabled()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 850))
    await expect
      .poll(() => chat.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeLessThanOrEqual(1)
    await page.screenshot({ path: path.join(evidence, 'codex-follow-up.png') })
    await followUp.dblclick()
    await expect.poll(ledger).toContain('补充：只处理 README')
    expect(ledger()).not.toContain('"type":"stop"')
    await expect(followUp).toBeDisabled()
    await composer.fill('停止后保留的草稿')
    await chat.getByRole('button', { name: '停止智能体', exact: true }).click()
    await expect.poll(ledger).toContain('"type":"stop"')
    await expect(page.getByText('本轮已停止，可以继续输入。', { exact: true })).toBeVisible()
    await expect(chat.getByText('本轮已中断', { exact: true })).toBeVisible()
    await expect(chat.getByText('Conversation interrupted', { exact: true })).toHaveCount(0)
    await expect(followUp).toHaveCount(0)
    await expect(composer).toContainText('停止后保留的草稿')
    await toolbar.getByRole('button', { name: '终端', exact: true }).click()
    expect(await pane.getAttribute('data-pty-id')).toBe(ptyId)
    await toolbar.getByRole('button', { name: '对话', exact: true }).click()
    await expect(composer).toContainText('停止后保留的草稿')
    await page.screenshot({ path: path.join(evidence, 'codex-stopped.png') })
    const entries: { type: string; text?: string; pid: number }[] = ledger()
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    expect(entries.filter((entry) => entry.type === 'start')).toHaveLength(1)
    const inputs = entries.filter((entry) => entry.type === 'input')
    expect(inputs).toHaveLength(2)
    // The terminal paste contract encodes embedded newlines as CR, within one submission.
    expect(inputs[0].text).toContain('请检查这份资料\r并保留原始结论')
    expect(inputs[0].text).toContain(path.join(profile, '测试项目', 'README.md'))
    expect(inputs[1].text).toBe('补充：只处理 README')
    expect(new Set(entries.map((entry) => entry.pid)).size).toBe(1)
    await toolbar.getByRole('button', { name: '分屏', exact: true }).click()
    await page.getByRole('menuitem', { name: '在右侧打开终端', exact: true }).click()
    await expect(page.locator('.pane[data-pty-id]:visible')).toHaveCount(2)
    await expect(toolbar.getByRole('button', { name: '对话', exact: true })).toBeDisabled()
    expect(await page.locator(`.pane[data-leaf-id="${leafId}"]`).getAttribute('data-pty-id')).toBe(
      ptyId
    )
    const visibleWindows = await app.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().filter((window) => window.isVisible()).length
    )
    expect(visibleWindows).toBe(0)
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'codex-workbench.json'),
      JSON.stringify(
        {
          packageFingerprint,
          ptyId,
          leafId,
          entries,
          visibleWindows,
          errors,
          provider: 'local Codex transcript and hook fixture; no real CLI or model API',
          verifiedAt: new Date().toISOString()
        },
        null,
        2
      )
    )
  } catch (error) {
    writeFileSync(
      path.join(evidence, 'codex-error-text.txt'),
      await page.locator('body').innerText()
    )
    await page.screenshot({ path: path.join(evidence, 'codex-error.png') })
    throw error
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
