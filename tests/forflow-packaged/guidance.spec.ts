import { test, expect } from '@stablyai/playwright-test'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('newcomer guidance reopens, explains shared files, and prepares examples without running work', async () => {
  const profile = privateProfile('guidance')
  const { app, page, errors } = await launch(profile)
  try {
    const workspaceId = await addPrivateProject(page, profile)
    const toolbar = page.locator('[data-forflow-session-toolbar]:visible').first()
    await expect(page.locator('.pane[data-pty-id]:visible')).toHaveCount(1)
    const panesBefore = await page.locator('.pane[data-pty-id]:visible').count()
    await toolbar.getByRole('button', { name: '操作指引', exact: true }).click()
    const guide = page.locator('[data-forflow-session-guide]')
    await expect(guide).toBeVisible()
    await expect(guide).toContainText('完成你的第一个任务')
    await guide.getByRole('button', { name: '3. 接续会话，或安排分工', exact: true }).click()
    await expect(guide).toContainText('点击“智能体协作”')
    await expect(guide).toContainText('编排与使用方法')
    await expect(guide).not.toContainText('准备对比草稿')
    expect(await page.locator('.pane[data-pty-id]:visible').count()).toBe(panesBefore)
    await page.screenshot({ path: path.join(evidence, 'guidance-parallel.png') })
    await page.keyboard.press('Escape')
    await expect(guide).toHaveCount(0)
    await toolbar.getByRole('button', { name: '操作指引', exact: true }).click()
    await guide.getByRole('button', { name: '2. 添加参考文件', exact: true }).click()
    await expect(guide).toContainText('文件引用指向任务所在电脑的文件')
    await guide.getByRole('button', { name: '4. 检查结果，再决定采用', exact: true }).click()
    await expect(guide).toContainText('再点“审阅结果”')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 720))
    const box = await guide.boundingBox()
    const viewport =
      page.viewportSize() ??
      (await page.evaluate(() => ({ width: innerWidth, height: innerHeight })))
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
    await page.screenshot({ path: path.join(evidence, 'guidance-review-compact.png') })
    await guide.getByRole('button', { name: '指给我看：分屏与并行', exact: true }).click()
    await expect(page.getByRole('dialog', { name: '拆分终端窗格', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-contextual-tour-panel]')).toHaveCount(0)

    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '外观', exact: true }).click()
    await page
      .getByRole('radiogroup', { name: '主题', exact: true })
      .getByRole('radio', { name: '深色', exact: true })
      .click()
    await page.keyboard.press('Escape')
    await expect(page.locator('html')).toHaveClass(/dark/)
    await toolbar.getByRole('button', { name: '操作指引', exact: true }).click()
    await expect(guide).toBeVisible()
    await expect
      .poll(() => guide.evaluate((element) => getComputedStyle(element).opacity))
      .toBe('1')
    await page.screenshot({
      path: path.join(evidence, 'guidance-dark.png'),
      animations: 'disabled'
    })
    await guide.getByRole('button', { name: '关闭指引', exact: true }).click()
    await page.getByRole('button', { name: '任务', exact: true }).click()
    await page
      .locator('[data-forflow-task-guide]')
      .getByRole('button', { name: '新建任务', exact: true })
      .click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('不知道怎么写？从一个示例开始', { exact: true }).click()
    await dialog.getByRole('button', { name: '先理解项目', exact: true }).click()
    const prompt = dialog.getByRole('textbox', { name: '这次要完成什么？', exact: true })
    await expect(prompt).toHaveValue(/暂时不要修改文件/)
    await expect(dialog.getByRole('button', { name: '实现一个小改动', exact: true })).toBeDisabled()
    await prompt.fill('保留我的任务说明')
    await expect(dialog.getByRole('button', { name: '检查已有改动', exact: true })).toBeDisabled()
    await expect(prompt).toHaveValue('保留我的任务说明')
    await page.screenshot({ path: path.join(evidence, 'guidance-task-example.png') })
    await page.keyboard.press('Escape')
    await page.locator(`[role="option"][data-worktree-id="${workspaceId}"]`).click()
    expect(await page.locator('.pane[data-pty-id]:visible').count()).toBe(panesBefore)
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((w) => w.isVisible())
      )
    ).toBe(false)
    writeFileSync(
      path.join(evidence, 'guidance.json'),
      JSON.stringify({ packageFingerprint, panesBefore, exampleSent: false, errors }, null, 2)
    )
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
