import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createChatProviderFixture } from './chat-provider-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('workbench: same PTY chat switch, draft, file reference, split and task entry', async () => {
  const profile = privateProfile('workbench')
  const fixture = createChatProviderFixture(profile)
  const { app, page, errors } = await launch(profile)
  try {
    const worktreeId = await addPrivateProject(page, profile)
    const toolbar = page.locator('[data-forflow-session-toolbar]:visible').first()
    await expect(toolbar).toBeVisible()
    const frame = await toolbar.locator('..').boundingBox()
    const host = await toolbar.locator('../..').boundingBox()
    expect(frame?.width).toBeCloseTo(host?.width ?? -1, 0)
    await expect(toolbar.getByRole('button', { name: '对话', exact: true })).toBeDisabled()
    const pane = page.locator('.pane[data-pty-id]:visible').first()
    await expect(pane).toBeVisible()
    const ptyId = await pane.getAttribute('data-pty-id')
    const leafId = await pane.getAttribute('data-leaf-id')
    if (!ptyId || !leafId) {
      throw new Error('Missing live pane identity')
    }
    await page.evaluate(({ ptyId, command }) => window.api.pty.write(ptyId, command, 'driving'), {
      ptyId,
      command: fixture.command
    })
    await expect.poll(() => readFileSync(fixture.ledger, 'utf8')).toContain('"type":"start"')
    await expect(toolbar.getByRole('button', { name: '对话', exact: true })).toBeEnabled()
    await toolbar.getByRole('button', { name: '对话', exact: true }).click()
    await expect(
      page.getByText('已连接原会话，可在对话与终端间切换。', { exact: true })
    ).toBeVisible()
    const composer = page.locator('.native-chat-pane-shell [contenteditable="true"]').first()
    await expect(composer).toBeVisible()
    await composer.fill('中文草稿，不要丢失')
    await toolbar.getByRole('button', { name: '终端', exact: true }).click()
    expect(await pane.getAttribute('data-pty-id')).toBe(ptyId)
    await toolbar.getByRole('button', { name: '对话', exact: true }).click()
    await expect(composer).toContainText('中文草稿，不要丢失')
    await composer.fill('请检查这份资料')

    await toolbar.getByRole('button', { name: '文件', exact: true }).click()
    const file = page.locator('[data-file-explorer-row]').filter({ hasText: 'README.md' }).first()
    await expect(file).toBeVisible()
    await file.dragTo(composer)
    const reference = composer.locator('[data-native-chat-file-reference]')
    await expect(reference).toHaveCount(1)
    await expect(reference).toHaveAttribute('title', path.join(profile, '测试项目', 'README.md'))
    await expect(composer).not.toContainText(profile)
    await composer
      .getByRole('button', {
        name: `移除引用：${path.join(profile, '测试项目', 'README.md')}`,
        exact: true
      })
      .press('Enter')
    await expect(reference).toHaveCount(0)
    await expect(composer).toContainText('请检查这份资料')
    expect(readFileSync(fixture.ledger, 'utf8')).not.toContain('"type":"input"')
    await file.dragTo(composer)
    await expect(reference).toHaveCount(1)
    await toolbar.getByRole('button', { name: '终端', exact: true }).click()
    await toolbar.getByRole('button', { name: '对话', exact: true }).click()
    await expect(reference).toHaveCount(1)
    await page.screenshot({ path: path.join(evidence, 'workbench-attachment.png') })
    await page
      .locator('.native-chat-pane-shell')
      .getByRole('button', { name: '发送', exact: true })
      .click()
    await expect.poll(() => readFileSync(fixture.ledger, 'utf8')).toContain('请检查这份资料')
    const entries = readFileSync(fixture.ledger, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    expect(entries.filter((e) => e.type === 'start')).toHaveLength(1)
    expect(
      entries.filter((e) => e.type === 'input' && e.text.includes('请检查这份资料'))
    ).toHaveLength(1)
    expect(entries.find((e) => e.type === 'input').text).toContain('README.md')
    expect(entries.find((e) => e.type === 'input').text).toMatch(/请检查这份资料\s+@/)
    expect(await pane.getAttribute('data-pty-id')).toBe(ptyId)
    await page.screenshot({ path: path.join(evidence, 'workbench-chat.png') })

    writeFileSync(path.join(profile, '测试项目', 'README.md'), '# 待审阅的更改\n')
    await toolbar.getByRole('button', { name: '查看更改', exact: true }).click()
    const changedFile = page
      .locator('[data-testid="source-control-entry"]')
      .filter({ hasText: 'README.md' })
    await expect(changedFile).toBeVisible()
    await page.screenshot({ path: path.join(evidence, 'workbench-review.png') })

    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '外观', exact: true }).click()
    await page
      .getByRole('radiogroup', { name: '主题', exact: true })
      .getByRole('radio', { name: '深色', exact: true })
      .click()
    await page.keyboard.press('Escape')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 850))
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect
      .poll(() => toolbar.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeLessThanOrEqual(1)
    await page.screenshot({ path: path.join(evidence, 'workbench-dark.png') })

    await toolbar.getByRole('button', { name: '分屏', exact: true }).click()
    await page.getByRole('menuitem', { name: '在右侧打开终端', exact: true }).click()
    await expect(page.locator('.pane[data-pty-id]:visible')).toHaveCount(2)
    await expect(toolbar.getByRole('button', { name: '对话', exact: true })).toBeDisabled()
    expect(await page.locator(`.pane[data-leaf-id="${leafId}"]`).getAttribute('data-pty-id')).toBe(
      ptyId
    )
    await toolbar.getByRole('button', { name: '并行与对比', exact: true }).click()
    await page.getByText('想分工处理不同任务？', { exact: true }).click()
    await page.getByRole('button', { name: '另开一个任务', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('测试项目')
    await page.screenshot({ path: path.join(evidence, 'workbench-new-task.png') })
    await page.keyboard.press('Escape')
    await page.screenshot({ path: path.join(evidence, 'workbench-split.png') })
    expect(errors).toEqual([])
    const visibleWindows = await app.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.isVisible()).length
    )
    expect(visibleWindows).toBe(0)
    writeFileSync(
      path.join(evidence, 'workbench.json'),
      JSON.stringify(
        {
          packageFingerprint,
          worktreeId,
          ptyId,
          leafId,
          entries,
          visibleWindows,
          errors,
          provider: 'local fixture, no model API',
          verifiedAt: new Date().toISOString()
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
