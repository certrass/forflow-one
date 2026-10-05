import {
  expect,
  type ElectronApplication,
  type Locator,
  type Page
} from '@stablyai/playwright-test'
import path from 'node:path'
import { evidence } from './harness'

const guideTitles = ['检查要求', '选择材料', '确认发送', '查看结果']
const sourceNames = ['requirement.md', 'receipt.txt', 'handoff.md']

export async function expectNoDeliverySend(app: ElectronApplication): Promise<void> {
  expect(await app.evaluate(() => process.env.FORFLOW_QA_DELIVERY_SENDS)).toBe('0')
}

export async function captureJevGuide(page: Page, step: number, screenshot: string): Promise<void> {
  const workflow = page.getByTestId('jev-delivery-workflow')
  await expect(
    workflow.getByRole('list', { name: '审阅步骤' }).locator('[aria-current="step"]')
  ).toHaveText(`${step}${guideTitles[step - 1]}`)
  const toggle = workflow.getByRole('button', { name: '操作说明', exact: true })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click()
  }
  const target =
    step < 3
      ? workflow.getByRole('button', {
          name: step === 1 ? '下一步：选择材料' : '下一步：预览材料',
          exact: true
        })
      : workflow.getByRole('heading', { name: guideTitles[step - 1], exact: true })
  await target.scrollIntoViewIfNeeded()
  const guide = page.getByRole('dialog', { name: guideTitles[step - 1], exact: true })
  await expect(guide).toBeVisible()
  await expect(guide).toHaveClass(/orca-contextual-tour-panel/)
  await expect(page.locator('[data-workspace-review-step-help]')).toHaveCount(1)
  await expect(guide.locator('svg').first()).toBeVisible()
  await expect
    .poll(async () => {
      const box = await guide.boundingBox()
      const anchor = await target.boundingBox()
      return Boolean(
        box &&
        anchor &&
        (box.x + box.width <= anchor.x ||
          box.x >= anchor.x + anchor.width ||
          box.y + box.height <= anchor.y ||
          box.y >= anchor.y + anchor.height)
      )
    })
    .toBe(true)
  await expect
    .poll(() =>
      guide.evaluate((element) => {
        const box = element.getBoundingClientRect()
        return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
      })
    )
    .toBe(true)
  expect(await workflow.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true
  )
  await page.screenshot({ path: path.join(evidence, `${screenshot}.png`), animations: 'disabled' })
  await guide.getByRole('button', { name: '收起 Jev 引导', exact: true }).click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await workflow.scrollIntoViewIfNeeded()
  await page.screenshot({
    path: path.join(evidence, `${screenshot}-clean.png`),
    animations: 'disabled'
  })
  await expect(page.locator('[data-workspace-review-step-help]')).toHaveCount(0)
}

async function expectSelection(input: Locator): Promise<void> {
  for (const file of sourceNames) {
    await expect(
      input.getByRole('checkbox', { name: `选择证据: ${file}`, exact: true })
    ).toBeChecked()
  }
  await expect(
    input.getByRole('checkbox', { name: '交付说明: handoff.md', exact: true })
  ).toBeChecked()
}

export async function prepareGuidedDelivery(app: ElectronApplication, page: Page): Promise<void> {
  const review = page.getByTestId('codex-review')
  const panel = review.getByTestId('jev-audit-panel')
  const workflow = panel.getByTestId('jev-delivery-workflow')
  const input = panel.getByTestId('jev-delivery-input')
  const help = page.locator('[data-workspace-review-step-help]')
  await expect(panel.getByTestId('jev-guide-goal')).toContainText('标题和状态保持一致')
  await expect(input).toHaveCount(0)
  await expectNoDeliverySend(app)
  await captureJevGuide(page, 1, 'jev-guide-goal')
  await workflow.getByRole('button', { name: '下一步：选择材料', exact: true }).click()
  await expect(input).toBeVisible()
  await expect(help).toHaveCount(0)
  await expect(
    workflow.getByRole('button', { name: '下一步：预览材料', exact: true })
  ).toBeDisabled()
  for (const file of sourceNames) {
    await input.getByRole('checkbox', { name: `选择证据: ${file}`, exact: true }).check()
  }
  await input.getByRole('checkbox', { name: '交付说明: handoff.md', exact: true }).check()
  await expectNoDeliverySend(app)
  const handoff = input.locator('li').filter({
    has: page.getByRole('checkbox', { name: '选择证据: handoff.md', exact: true })
  })
  await handoff.getByRole('button', { name: '查看材料', exact: true }).click()
  await expect(review.getByRole('tab', { name: '记录', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await expect(review.getByRole('button', { name: '带我审阅', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false'
  )
  await expect(help).toHaveCount(0)
  const source = review
    .getByTestId('workspace-review-records')
    .locator('li')
    .filter({
      has: page.getByText('handoff.md', { exact: true })
    })
  await expect(source).toHaveAttribute('data-current', 'true')
  await source.getByRole('button', { name: '本机查看来源', exact: true }).click()
  await expect(review.getByTestId('workspace-review-records').locator('pre')).toContainText(
    '使用 r1 测试账户'
  )
  await review.getByRole('tab', { name: 'Jev · Beta', exact: true }).click()
  await expectSelection(input)
  await expect(help).toHaveCount(0)
  await captureJevGuide(page, 2, 'jev-guide-materials')
  await workflow.getByRole('button', { name: '操作说明', exact: true }).click()
  await expect(help).toHaveCount(1)
  await page.getByRole('tab', { name: '使用分析', exact: true }).click()
  await expect(help).toHaveCount(0)
  await page.getByRole('tab', { name: '审阅', exact: true }).click()
  await expect(help).toHaveCount(1)
  await expectSelection(input)
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 850))
  await captureJevGuide(page, 2, 'jev-guide-narrow')
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1450, 1100))
  await workflow.getByRole('button', { name: '下一步：预览材料', exact: true }).click()
  const preview = panel.getByTestId('jev-request-preview')
  await expect(preview).toContainText('问题为空；测试失败')
  await expect(input).toHaveCount(0)
  await expect(help).toHaveCount(0)
  await expectNoDeliverySend(app)
  await workflow.getByRole('button', { name: '上一步', exact: true }).click()
  await expectSelection(input)
  await expect(preview).toHaveCount(0)
  await expect(workflow.getByRole('button', { name: '发送给 Jev', exact: true })).toHaveCount(0)
  await expect(help).toHaveCount(0)
  await expectNoDeliverySend(app)
  await workflow.getByRole('button', { name: '下一步：预览材料', exact: true }).click()
  await expect(preview).toContainText('标题和状态保持一致')
  await expect(preview).not.toContainText('synthetic-secret-00000000')
  await expect(input).toHaveCount(0)
  await expect(help).toHaveCount(0)
  await expectNoDeliverySend(app)
  await captureJevGuide(page, 3, 'jev-guide-preview')
}
