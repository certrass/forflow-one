import {
  expect,
  type Locator,
  type Page,
  type ElectronApplication
} from '@stablyai/playwright-test'
import path from 'node:path'
import { evidence } from './harness'

export async function selectReviewFiles(
  intake: Locator,
  files: { path: string; verification?: boolean }[]
): Promise<void> {
  for (const file of files) {
    const root = intake.getByRole('button', { name: '项目根目录', exact: true })
    if (await root.isEnabled()) {
      await root.click()
    }
    const parts = file.path.split('/')
    for (let i = 0; i < parts.length - 1; i += 1) {
      await intake
        .getByRole('button', { name: `打开文件夹 ${parts.slice(0, i + 1).join('/')}`, exact: true })
        .click()
    }
    await intake.getByRole('checkbox', { name: file.path, exact: true }).check()
    if (file.verification) {
      await intake.getByRole('combobox', { name: `文件用途: ${file.path}`, exact: true }).click()
      await intake.page().getByRole('option', { name: '测试或构建记录', exact: true }).click()
    }
  }
}

export async function captureReviewIntake(app: ElectronApplication, page: Page): Promise<void> {
  const intake = page.getByTestId('workspace-review-intake')
  await expect(intake.getByText('1. 选择项目', { exact: true })).toBeVisible()
  await expect(intake.getByRole('textbox', { name: '检查目标', exact: true })).toBeVisible()
  await expect(intake.getByText('3. 选择审阅材料', { exact: true })).toBeVisible()
  expect(await intake.locator('details').last().getAttribute('open')).toBeNull()
  await expect(intake.getByRole('button', { name: '进入审阅', exact: true })).toBeEnabled()
  expect(await page.evaluate(() => window.api.codexUsage.listWorkspaceReviews!())).toHaveLength(0)
  await intake.getByText('项目审阅', { exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({
    path: path.join(evidence, 'project-review-intake-desktop.png'),
    animations: 'disabled'
  })
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 850))
  await intake.getByText('项目审阅', { exact: true }).scrollIntoViewIfNeeded()
  expect(await intake.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({
    path: path.join(evidence, 'project-review-intake-narrow.png'),
    animations: 'disabled'
  })
  await intake.getByRole('button', { name: '进入审阅', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({
    path: path.join(evidence, 'project-review-intake-selection.png'),
    animations: 'disabled'
  })
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1500, 1100))
}
