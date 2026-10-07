import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createChatProviderFixture } from './chat-provider-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('CSV output can be filtered, edited and saved from the packaged Chinese workspace', async () => {
  const profile = privateProfile('upstream-csv')
  const fixture = createChatProviderFixture(profile, 'codex', { seedConversation: false })
  const seedPath = path.join(profile, 'orca-data.json')
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
  Object.assign(seed.settings, {
    defaultTuiAgent: 'codex',
    agentCmdOverrides: { codex: fixture.command.trim() },
    experimentalNativeChat: true,
    experimentalStructuredNativeChat: false,
    openAgentTabsInChatByDefault: true,
    editorAutoSave: false
  })
  writeFileSync(seedPath, JSON.stringify(seed))
  const { app, page, errors } = await launch(profile)
  const file = path.join(profile, '测试项目', '交付清单.csv')
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 900))
    await addPrivateProject(page, profile)
    writeFileSync(
      file,
      '\ufeff任务,状态,负责人\r\n登录流程,待检查,张明\r\n账单设置,已完成,李华\r\n'
    )
    await page
      .locator('[data-forflow-session-toolbar]:visible')
      .first()
      .getByRole('button', { name: '查看产出', exact: true })
      .click()
    await page.getByRole('menuitem', { name: '文件', exact: true }).click()
    await page.getByText('交付清单.csv', { exact: true }).first().dblclick()
    const grid = page.getByTestId('csv-grid')
    await expect(grid).toHaveAttribute('role', 'grid')
    await expect(grid.getByRole('gridcell', { name: '登录流程', exact: true })).toBeVisible()
    const filter = page.getByRole('textbox', { name: '筛选行', exact: true })
    await filter.fill('账单设置')
    await expect(grid.getByRole('gridcell', { name: '登录流程', exact: true })).toHaveCount(0)
    await expect(grid.getByRole('gridcell', { name: '账单设置', exact: true })).toBeVisible()
    await filter.fill('')
    await grid.getByRole('gridcell', { name: '待检查', exact: true }).dblclick()
    const cell = page.getByRole('textbox', { name: /编辑第.*行/ })
    await cell.fill('取消的修改')
    await cell.press('Escape')
    await expect(grid.getByRole('gridcell', { name: '待检查', exact: true })).toBeVisible()
    await grid.getByRole('gridcell', { name: '待检查', exact: true }).dblclick()
    await cell.fill('已复核')
    await cell.press('Enter')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    const expected = '\ufeff任务,状态,负责人\r\n登录流程,已复核,张明\r\n账单设置,已完成,李华\r\n'
    await expect.poll(() => readFileSync(file, 'utf8')).toBe(expected)
    await page.screenshot({ path: path.join(evidence, 'upstream-csv-edited.png') })
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((window) => window.isVisible())
      )
    ).toBe(false)
    writeFileSync(
      path.join(evidence, 'upstream-csv.json'),
      JSON.stringify(
        {
          packageFingerprint,
          errors,
          savedContent: readFileSync(file, 'utf8')
        },
        null,
        2
      )
    )
  } catch (error) {
    writeFileSync(
      path.join(evidence, 'upstream-csv-error.txt'),
      await page.locator('body').innerText()
    )
    await page.screenshot({ path: path.join(evidence, 'upstream-csv-error.png') })
    throw error
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
