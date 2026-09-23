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

export async function enterReviewGoal(intake: Locator, goal: string): Promise<void> {
  await intake.getByRole('button', { name: '继续：确定检查目标', exact: true }).click()
  await expect(intake.getByRole('combobox', { name: '项目', exact: true })).toHaveCount(0)
  await expect(intake.getByTestId('workspace-review-file-picker')).toHaveCount(0)
  await intake.getByRole('textbox', { name: '检查目标', exact: true }).fill(goal)
  await intake.getByRole('button', { name: '继续：选择材料', exact: true }).click()
}

export async function captureReviewGuide(page: Page, step: number, ready = true): Promise<void> {
  const intake = page.getByTestId('workspace-review-intake')
  await expect(intake.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(step))
  await intake.getByText('项目审阅向导', { exact: true }).scrollIntoViewIfNeeded()
  const help = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('button', { name: '关闭这条提示', exact: true }) })
  const toggle = intake.getByRole('button', { name: '这一步怎么做', exact: true })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click()
  }
  await expect(help).toBeVisible()
  await expect(help).toHaveClass(/orca-contextual-tour-panel/)
  const action = intake.getByRole('button', {
    name: step === 1 ? '继续：确定检查目标' : step === 2 ? '继续：选择材料' : '进入审阅',
    exact: true
  })
  const target = ready
    ? action
    : step === 1
      ? intake.getByRole('combobox', { name: '项目', exact: true })
      : intake.getByRole('button', { name: '验证问题修复', exact: true })
  const targetBox = await target.boundingBox()
  expect(targetBox).not.toBeNull()
  await expect
    .poll(async () => {
      const box = await help.boundingBox()
      return Boolean(
        box &&
        targetBox &&
        (box.x + box.width <= targetBox.x ||
          box.x >= targetBox.x + targetBox.width ||
          box.y + box.height <= targetBox.y ||
          box.y >= targetBox.y + targetBox.height)
      )
    })
    .toBe(true)
  expect(await help.evaluate((element) => getComputedStyle(element).overflow)).toBe('visible')
  await expect(help.locator('svg').first()).toBeVisible()
  if (step === 2 && !ready) {
    const box = await help.boundingBox()
    for (const name of ['检查交付材料', '验证问题修复', '对照需求验收']) {
      const preset = await intake.getByRole('button', { name, exact: true }).boundingBox()
      expect(
        Boolean(
          box &&
          preset &&
          (box.x + box.width <= preset.x ||
            box.x >= preset.x + preset.width ||
            box.y + box.height <= preset.y ||
            box.y >= preset.y + preset.height)
        )
      ).toBe(true)
    }
  }
  expect(
    await help.evaluate((element) => {
      const box = element.getBoundingClientRect()
      return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
    })
  ).toBe(true)
  await page.screenshot({
    path: path.join(evidence, `project-review-guide-step-${step}${ready ? '' : '-choose'}.png`),
    animations: 'disabled'
  })
  await help.getByRole('button', { name: '关闭这条提示', exact: true }).click()
}

export async function captureReviewIntake(app: ElectronApplication, page: Page): Promise<void> {
  const intake = page.getByTestId('workspace-review-intake')
  await expect(intake.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
  await expect(intake.getByRole('textbox', { name: '检查目标', exact: true })).toHaveCount(0)
  await expect(intake.getByRole('combobox', { name: '项目', exact: true })).toHaveCount(0)
  expect(await intake.locator('details').first().getAttribute('open')).toBeNull()
  await expect(intake.getByRole('button', { name: '进入审阅', exact: true })).toBeEnabled()
  expect(await page.evaluate(() => window.api.codexUsage.listWorkspaceReviews!())).toHaveLength(0)
  await captureReviewGuide(page, 3)
  await intake.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(intake.getByRole('textbox', { name: '检查目标', exact: true })).not.toHaveValue('')
  await captureReviewGuide(page, 2)
  await intake.getByRole('button', { name: '继续：选择材料', exact: true }).click()
  await expect(intake.getByRole('button', { name: '移除 code.ts', exact: true })).toBeVisible()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 850))
  await intake.getByText('项目审阅向导', { exact: true }).scrollIntoViewIfNeeded()
  expect(await intake.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await expect(page.getByRole('button', { name: '关闭这条提示', exact: true })).toBeVisible()
  await page.screenshot({
    path: path.join(evidence, 'project-review-guide-narrow.png'),
    animations: 'disabled'
  })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: '关闭这条提示', exact: true })).toHaveCount(0)
  await expect(intake.getByRole('button', { name: '进入审阅', exact: true })).toBeEnabled()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1500, 1100))
}
