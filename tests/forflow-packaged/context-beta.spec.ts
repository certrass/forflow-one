import { test, expect } from '@stablyai/playwright-test'
import { createHash } from 'node:crypto'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createChatProviderFixture } from './chat-provider-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('context Beta: opt-in, scoped source receipt, no automatic send, and disable', async () => {
  const profile = privateProfile('context-beta')
  const fixture = createChatProviderFixture(profile, 'codex')
  const { app, page, errors } = await launch(profile)
  const ledger = () => readFileSync(fixture.ledger, 'utf8')
  try {
    const workspaceId = await addPrivateProject(page, profile)
    const pane = page.locator('.pane[data-pty-id]:visible').first()
    await expect(pane).toBeVisible()
    const ptyId = await pane.getAttribute('data-pty-id')
    if (!ptyId) {
      throw new Error('Missing PTY identity')
    }
    await page.evaluate(({ ptyId, command }) => window.api.pty.write(ptyId, command), {
      ptyId,
      command: fixture.command
    })
    const toolbar = page.locator('[data-forflow-session-toolbar]:visible').first()
    await expect.poll(ledger).toContain('"type":"start"')
    await expect(toolbar.getByRole('button', { name: '对话', exact: true })).toBeEnabled()
    await toolbar.getByRole('button', { name: '对话', exact: true }).click()
    await expect(
      page.getByText('已连接原会话，可在对话与终端间切换。', { exact: true })
    ).toBeVisible()
    await expect(page.locator('[data-forflow-context-beta]')).toHaveCount(0)
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '实验性', exact: true }).click()
    const toggle = page.getByRole('switch', { name: '接续预检 · Beta', exact: true })
    await expect(toggle).not.toBeChecked()
    await toggle.click()
    await expect(toggle).toBeChecked()
    await page.keyboard.press('Escape')
    // Isolate the system clipboard while verifying the exact UI export path.
    await page.evaluate(() => {
      let text = ''
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            text = value
          },
          readText: async () => text
        }
      })
    })
    await page.getByRole('button', { name: '接续预检 · Beta', exact: true }).click()
    const dialog = page.locator('[data-forflow-context-preview]')
    await expect(dialog).toContainText('工作台测试任务')
    await expect(dialog).toContainText('智能体陈述 · 未核实')
    const copy = dialog.getByRole('button', { name: '复制交接材料与来源回执', exact: true })
    await expect(copy).toBeEnabled()
    await copy.click()
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('forflow-context-preview')
    const receipt = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))
    expect(receipt.packet.scope.sessionId).toBe('forflow-gui-fixture-session')
    expect(receipt.packet.scope.workspaceId).toBe(workspaceId)
    expect(
      receipt.packet.items.some(
        (item: { role: string; text: string }) =>
          item.role === 'user' && item.text === '工作台测试任务'
      )
    ).toBe(true)
    expect(receipt.sha256).toBe(
      createHash('sha256').update(JSON.stringify(receipt.packet)).digest('hex')
    )
    expect(ledger()).not.toContain('"type":"input"')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 720))
    await expect.poll(() => dialog.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
    await page.screenshot({
      path: path.join(evidence, 'context-beta-compact.png'),
      animations: 'disabled'
    })
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '外观', exact: true }).click()
    await page
      .getByRole('radiogroup', { name: '主题', exact: true })
      .getByRole('radio', { name: '深色', exact: true })
      .click()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '接续预检 · Beta', exact: true }).click()
    await expect(dialog).toBeVisible()
    await page.screenshot({
      path: path.join(evidence, 'context-beta-dark.png'),
      animations: 'disabled'
    })
    const clippedText = '新增要求\n[Orca: output truncated — 90000 bytes total, digest abc123]'
    const timestamp = new Date().toISOString()
    appendFileSync(
      fixture.transcript,
      `${[
        {
          timestamp,
          type: 'response_item',
          payload: {
            type: 'message',
            id: 'clipped-response',
            role: 'user',
            content: [{ type: 'input_text', text: clippedText }]
          }
        },
        {
          timestamp,
          type: 'event_msg',
          payload: {
            type: 'item_completed',
            item: {
              type: 'UserMessage',
              id: 'clipped-item',
              content: [{ type: 'text', text: clippedText }]
            }
          }
        }
      ]
        .map((record) => JSON.stringify(record))
        .join('\n')}\n`
    )
    await expect(copy).toBeDisabled()
    await dialog.getByRole('button', { name: '刷新预览', exact: true }).click()
    await expect(dialog).toContainText('源记录已被截断')
    await expect(copy).toBeDisabled()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      JSON.stringify(receipt, null, 2)
    )
    await page.screenshot({
      path: path.join(evidence, 'context-beta-truncated.png'),
      animations: 'disabled'
    })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '实验性', exact: true }).click()
    await toggle.click()
    await expect(toggle).not.toBeChecked()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-forflow-context-beta]')).toHaveCount(0)
    expect(ledger()).not.toContain('"type":"input"')
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((window) => window.isVisible())
      )
    ).toBe(false)
    writeFileSync(
      path.join(evidence, 'context-beta.json'),
      JSON.stringify(
        {
          packageFingerprint,
          receipt,
          truncatedSourceCopyBlocked: true,
          automaticInputCount: 0,
          errors
        },
        null,
        2
      )
    )
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
