import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createChatProviderFixture } from './chat-provider-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('parallel guide prepares both drafts and carries comparison materials into native chat', async () => {
  const profile = privateProfile('parallel-guidance')
  const fixture = createChatProviderFixture(profile, 'codex', { seedConversation: false })
  const profileFile = path.join(profile, 'orca-data.json')
  const seed = JSON.parse(readFileSync(profileFile, 'utf8'))
  Object.assign(seed.settings, {
    defaultTuiAgent: 'codex',
    agentCmdOverrides: { codex: fixture.command.trim() },
    experimentalNativeChat: true,
    experimentalStructuredNativeChat: false,
    openAgentTabsInChatByDefault: true
  })
  writeFileSync(profileFile, JSON.stringify(seed))
  const { app, page, errors } = await launch(profile)
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1250, 900))
    await addPrivateProject(page, profile)
    const repo = path.join(profile, '测试项目')
    writeFileSync(
      path.join(repo, '方案A.md'),
      '# 版本 A · 示例产出\n表单分为目标、材料、确认三个步骤。\n验证：键盘导航通过，仍需检查窄窗口。\n'
    )
    writeFileSync(
      path.join(repo, '方案B.md'),
      '# 版本 B · 示例产出\n同一页填写目标并选择材料，提交前集中确认。\n验证：窄窗口通过，仍需检查键盘导航。\n'
    )
    execFileSync('git', ['add', '.'], { cwd: repo })
    execFileSync('git', ['commit', '-m', 'Add synthetic comparison outputs'], { cwd: repo })
    const toolbar = page.locator('[data-forflow-session-toolbar]:visible').first()
    const entry = toolbar.getByRole('button', { name: '并行与对比', exact: true })
    await expect(entry).toBeVisible()
    await expect(
      page.locator('.native-chat-pane-shell:visible [contenteditable="true"]').first()
    ).toBeEditable()
    const notice = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: 'Codex 现在使用独立服务运行' })
    if (await notice.isVisible()) {
      await notice.getByRole('button', { name: 'Close toast', exact: true }).click()
    }
    const panesBefore = await page.locator('.pane[data-pty-id]:visible').count()
    await entry.click()
    const guide = page.locator('[data-forflow-parallel-guide]')
    await expect(guide).toContainText('同一任务，多做一版')
    await expect(guide).toContainText('添加两份产出或粘贴内容')
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, '01-parallel-guide.png')
    })
    await page.keyboard.press('Escape')
    await expect(guide).toHaveCount(0)
    await expect
      .poll(() => entry.evaluate((element) => document.activeElement === element))
      .toBe(true)
    await entry.click()
    await guide.getByRole('button', { name: '同题再做一版', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: '同题再做一版', exact: true })).toBeVisible()
    await expect(dialog).toContainText('测试项目')
    const prompt = dialog.getByRole('textbox', { name: '这次要完成什么？', exact: true })
    await expect(prompt).toHaveValue(/每个任务使用相同的目标/)
    await prompt.fill('保留我的任务说明')
    await expect(dialog.getByRole('button', { name: '对比两份产出', exact: true })).toHaveCount(0)
    await expect(prompt).toHaveValue('保留我的任务说明')
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, '02-alternative-draft.png')
    })
    await page.keyboard.press('Escape')
    expect(await page.locator('.pane[data-pty-id]:visible').count()).toBe(panesBefore)

    await page.evaluate(() => window.api.settings.set({ theme: 'dark' }))
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 740))
    await entry.click()
    await expect(guide).toBeVisible()
    expect(
      await guide.evaluate((element) => {
        const box = element.getBoundingClientRect()
        return (
          box.left >= 0 &&
          box.right <= innerWidth &&
          box.top >= 0 &&
          box.bottom <= innerHeight &&
          element.scrollWidth <= element.clientWidth
        )
      })
    ).toBe(true)
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, '03-parallel-guide-dark.png')
    })
    await guide.getByRole('button', { name: '准备对比草稿', exact: true }).click()
    await expect(dialog.getByRole('heading', { name: '对比两份产出', exact: true })).toBeVisible()
    await expect(prompt).toHaveValue(/版本 A/)
    await expect(prompt).toHaveValue(/版本 B/)
    await prompt.fill(
      '请比较版本 A 和版本 B 的任务创建引导。标准：步骤清楚、键盘可用、窄窗口可读。逐项列出依据和推荐方案。'
    )
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, '04-comparison-draft.png')
    })
    const create = dialog.getByRole('button', { name: /^创建并准备对话/ })
    await expect(create).toBeEnabled()
    await create.click()
    await expect(dialog).toHaveCount(0)
    const chat = page.locator('.native-chat-pane-shell:visible').last()
    const composer = chat.locator('[contenteditable="true"]').first()
    await expect(composer).toContainText('请比较版本 A 和版本 B')
    await toolbar.getByRole('button', { name: '查看产出', exact: true }).click()
    await page.getByRole('menuitem', { name: '文件', exact: true }).click()
    for (const name of ['方案A.md', '方案B.md']) {
      await page
        .locator('[data-file-explorer-row]')
        .filter({ hasText: name })
        .first()
        .dragTo(composer)
    }
    await expect(composer.locator('[data-native-chat-file-reference]')).toHaveCount(2)
    expect(readFileSync(fixture.ledger, 'utf8')).not.toContain('"type":"input"')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1250, 900))
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, '05-comparison-materials.png')
    })
    expect(errors).toEqual([])
    const windows = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().map((window) => ({
        visible: window.isVisible(),
        focused: window.isFocused()
      }))
    )
    expect(windows.every((window) => !window.visible && !window.focused)).toBe(true)
    writeFileSync(
      path.join(evidence, 'parallel-guidance.json'),
      JSON.stringify(
        {
          packageFingerprint,
          synthetic: true,
          sent: false,
          windows,
          errors,
          checked: [
            'visible entry',
            'keyboard dismissal',
            'current project',
            'editable draft',
            'dark narrow layout',
            'workspace creation',
            'native chat draft',
            'two file references'
          ]
        },
        null,
        2
      )
    )
  } catch (error) {
    await page.screenshot({ path: path.join(evidence, 'parallel-failure.png') })
    writeFileSync(
      path.join(evidence, 'parallel-failure.txt'),
      await page.locator('body').innerText()
    )
    throw error
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
