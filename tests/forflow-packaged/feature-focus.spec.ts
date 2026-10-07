import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createChatProviderFixture } from './chat-provider-fixture'
import { enterReviewGoal, selectReviewFiles } from './workspace-review-intake-qa'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('task actions lead to drafts and material review, then return to the original conversation', async () => {
  const profile = privateProfile('feature-focus')
  const fixture = createChatProviderFixture(profile, 'codex', { seedConversation: false })
  const seedPath = path.join(profile, 'orca-data.json')
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
  Object.assign(seed.settings, {
    defaultTuiAgent: 'codex',
    agentCmdOverrides: { codex: fixture.command.trim() },
    experimentalNativeChat: true,
    experimentalStructuredNativeChat: false,
    openAgentTabsInChatByDefault: true
  })
  writeFileSync(seedPath, JSON.stringify(seed))
  const { app, page, errors } = await launch(profile)
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 900))
    const workspaceId = await addPrivateProject(page, profile)
    writeFileSync(
      path.join(profile, '测试项目', 'README.md'),
      '# 交付要求\n新用户可以新建任务、准备方案对比，并选择材料开始审阅。\n'
    )
    writeFileSync(
      path.join(profile, '测试项目', '方案说明.md'),
      '# 方案说明\n任务页提供新建、并行做方案和审阅结果三个入口。\n'
    )
    const toolbar = page.locator('[data-forflow-session-toolbar]:visible').first()
    const composer = page
      .locator('.native-chat-pane-shell:visible [contenteditable="true"]')
      .first()
    await expect(composer).toBeEditable()
    await composer.fill('保留原任务的草稿')
    for (const close of await page.locator('[data-sonner-toast] [data-close-button]').all()) {
      await close.click()
    }
    await page.getByRole('button', { name: '任务', exact: true }).click()
    const hub = page.locator('[data-forflow-task-guide]')
    await expect(hub.getByRole('button', { name: '新建任务', exact: true })).toBeVisible()
    const typography = await hub.evaluate((element) =>
      ['h2', 'p', 'button'].map((selector) => {
        const node = element.querySelector(selector)
        if (!node) {
          throw new Error(`Missing task guide element: ${selector}`)
        }
        const style = getComputedStyle(node)
        return {
          selector,
          family: style.fontFamily,
          size: style.fontSize,
          weight: style.fontWeight,
          lineHeight: style.lineHeight
        }
      })
    )
    for (const style of typography) {
      expect(style.family).toContain('PingFang SC')
    }
    await page.screenshot({
      path: path.join(evidence, 'feature-task-actions.png'),
      animations: 'disabled'
    })
    await hub.getByRole('button', { name: '智能体协作', exact: true }).click()
    await expect(page.getByText('移交活动任务', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '返回应用', exact: true }).click()
    await hub.getByRole('button', { name: '审阅结果', exact: true }).click()
    const review = page.getByRole('dialog', { name: '审阅结果', exact: true })
    await expect(review).toBeVisible()
    await expect(review.getByRole('tab', { name: '概览', exact: true })).toHaveCount(0)
    await expect(review).toHaveCSS('opacity', '1')
    await page.screenshot({
      path: path.join(evidence, 'feature-review-project.png'),
      animations: 'disabled'
    })
    const intake = review.getByTestId('workspace-review-intake')
    await intake.getByRole('combobox', { name: '项目', exact: true }).click()
    await page.getByRole('option').filter({ hasText: '测试项目' }).click()
    await enterReviewGoal(intake, '新用户能找到任务、并行与审阅入口，并用键盘完成材料选择。')
    await selectReviewFiles(intake, [{ path: 'README.md' }, { path: '方案说明.md' }])
    await expect(review).toHaveCSS('opacity', '1')
    const selected = intake.getByTestId('workspace-review-selected-files')
    const selectedBox = await selected.boundingBox()
    const filesBox = await intake
      .getByRole('checkbox', { name: 'README.md', exact: true })
      .boundingBox()
    expect(selectedBox && filesBox && selectedBox.x > filesBox.x).toBeTruthy()
    expect(selectedBox && selectedBox.y + selectedBox.height < 800).toBeTruthy()
    await page.screenshot({
      path: path.join(evidence, 'feature-review-materials.png'),
      animations: 'disabled'
    })
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(680, 720))
    await intake.getByRole('button', { name: '开始审阅', exact: true }).scrollIntoViewIfNeeded()
    expect(await review.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true
    )
    expect(
      await review.evaluate((element) => element.getBoundingClientRect().left)
    ).toBeGreaterThanOrEqual(16)
    const narrowSelectedBox = await selected.boundingBox()
    const narrowFilesBox = await intake
      .getByRole('checkbox', { name: '方案说明.md', exact: true })
      .boundingBox()
    expect(
      narrowSelectedBox && narrowFilesBox && narrowSelectedBox.y > narrowFilesBox.y
    ).toBeTruthy()
    await page.screenshot({
      path: path.join(evidence, 'feature-review-materials-compact.png'),
      animations: 'disabled'
    })
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 900))
    const material = intake.getByRole('checkbox', { name: '方案说明.md', exact: true })
    await material.focus()
    await page.keyboard.press('Space')
    await expect(material).not.toBeChecked()
    await page.keyboard.press('Space')
    await expect(material).toBeChecked()
    await intake.getByRole('button', { name: '开始审阅', exact: true }).click()
    await expect(review.getByRole('button', { name: '返回项目审阅', exact: true })).toBeVisible()
    await review.getByRole('button', { name: '关闭', exact: true }).click()
    await page.locator(`[role="option"][data-worktree-id="${workspaceId}"]`).click()
    await expect(composer).toHaveText('保留原任务的草稿')
    expect(
      await toolbar
        .getByRole('button', { name: '审阅结果', exact: true })
        .evaluate((element) => element.getBoundingClientRect().height)
    ).toBe(32)
    await toolbar.getByRole('button', { name: '查看产出', exact: true }).click()
    await page.getByRole('menuitem', { name: '文件', exact: true }).click()
    await expect(page.getByText('方案说明.md', { exact: true }).first()).toBeVisible()
    await page.screenshot({
      path: path.join(evidence, 'feature-session-actions.png'),
      animations: 'disabled'
    })
    await toolbar.getByRole('button', { name: '审阅结果', exact: true }).click()
    await expect(review.getByRole('button', { name: '打开审阅', exact: true })).toBeVisible()
    await review.getByRole('button', { name: '关闭', exact: true }).click()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 720))
    await page.evaluate(() => window.api.settings.set({ theme: 'dark' }))
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await toolbar.getByRole('button', { name: '审阅结果', exact: true }).click()
    await expect(review).toHaveCSS('opacity', '1')
    expect(
      await review.evaluate((element) => {
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
      path: path.join(evidence, 'feature-review-dark-compact.png'),
      animations: 'disabled'
    })
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((window) => window.isVisible())
      )
    ).toBe(false)
    writeFileSync(
      path.join(evidence, 'feature-focus.json'),
      JSON.stringify(
        { packageFingerprint, typography, errors, externalMessagesSent: false },
        null,
        2
      )
    )
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
