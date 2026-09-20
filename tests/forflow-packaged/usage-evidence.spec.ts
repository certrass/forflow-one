import { test, expect } from '@stablyai/playwright-test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

function seedUsage(profile: string, id: string, model: string): void {
  const dir = path.join(profile, 'home', '.codex', 'sessions')
  mkdirSync(dir, { recursive: true })
  const timestamp = new Date().toISOString()
  const tokens = {
    input_tokens: 1000,
    cached_input_tokens: 400,
    output_tokens: 250,
    total_tokens: 1250
  }
  const records = [
    { type: 'session_meta', payload: { id, cwd: path.join(profile, 'folder-project') } },
    { type: 'turn_context', payload: { model } },
    {
      timestamp,
      type: 'event_msg',
      payload: {
        type: 'token_count',
        info: { last_token_usage: tokens, total_token_usage: tokens }
      }
    }
  ]
  writeFileSync(
    path.join(dir, `rollout-${id}.jsonl`),
    `${records.map((row) => JSON.stringify(row)).join('\n')}\n`
  )
}

test('usage Beta: integrated cost switch, expandable evidence, real scan and filters', async () => {
  const profile = privateProfile('usage-evidence')
  seedUsage(profile, 'known-model', 'gpt-5')
  const { app, page, errors } = await launch(profile)
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 1150))
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
    const providerMenu = page.getByRole('button', { name: /使用情况分析提供商/ })
    await providerMenu.click()
    await page.getByRole('menuitem', { name: 'Codex', exact: true }).click()
    const panel = page.locator('[data-forflow-usage-evidence]')
    const cost = page.locator('[data-forflow-usage-cost]')
    await expect(panel).toContainText('已读取 0 条用量记录')
    await expect(panel.getByText('待补证据', { exact: false })).toHaveCount(0)
    await page.getByRole('switch', { name: /启用 Codex/ }).click()
    const filters = page.getByRole('button', { name: 'Codex 使用量选项', exact: true })
    await filters.click()
    await page.getByRole('menuitemradio', { name: '所有本地 Codex 使用情况', exact: true }).click()
    await expect(panel).toContainText('已读取 1 条用量记录')
    await expect(cost).toContainText('USD')
    seedUsage(profile, 'unknown-model', 'unpriced-private-model')
    await page.getByRole('button', { name: '刷新 Codex 使用量', exact: true }).click()
    await expect(panel).toContainText('已读取 2 条用量记录')
    await expect(cost).toContainText('已知部分')
    for (const [basis, value] of [
      ['不可计量', '1 条缺价'],
      ['已结算', '未接入账单'],
      ['套餐分摊', '未配置分摊'],
      ['估算', 'USD']
    ]) {
      await cost.getByRole('button', { name: /费用口径/ }).click()
      await page.getByRole('menuitemradio', { name: basis, exact: true }).click()
      await expect(cost).toContainText(value)
    }
    await panel.getByRole('button', { name: '来源与范围' }).click()
    const sources = page.getByLabel('用量证据来源')
    await expect(sources).toContainText('当前主机全部日志')
    await expect(sources).toContainText('2 条计量事件')
    await expect(sources).toContainText('最近 30 天')
    await page.keyboard.press('Escape')
    for (const name of ['上下文', '模型调用', '工具调用', '数据读取']) {
      await panel.getByRole('button', { name: `${name}审计详情` }).click()
      await expect(panel.getByLabel(`${name}审计证据`)).toContainText('待补证据')
      await expect(
        panel.locator('[data-slot="collapsible-content"][data-state="open"]')
      ).toHaveCount(1)
    }
    await panel.getByRole('button', { name: '数据读取审计详情' }).click()
    const summary = await page.evaluate(() =>
      window.api.codexUsage.getSummary({ scope: 'all', range: '30d' })
    )
    expect(summary.costCoverage).toEqual({
      pricedRecords: 1,
      unpricedRecords: 1,
      unclassifiedRecords: 0
    })
    await filters.click()
    await page.getByRole('menuitemradio', { name: '仅 Forflow One 工作树', exact: true }).click()
    await expect(panel).toContainText('已读取 0 条用量记录')
    await expect(cost).toContainText('暂无金额')
    await panel.getByRole('button', { name: '模型调用审计详情' }).click()
    await expect(panel.getByLabel('模型调用审计证据')).toContainText('当前来源或范围尚无可核验')
    await filters.click()
    await page.getByRole('menuitemradio', { name: '所有本地 Codex 使用情况', exact: true }).click()
    await filters.click()
    await page.getByRole('menuitemradio', { name: '过去 7 天', exact: true }).click()
    await panel.getByRole('button', { name: '来源与范围' }).click()
    await expect(sources).toContainText('最近 7 天')
    await page.keyboard.press('Escape')
    await providerMenu.click()
    await page.getByRole('menuitem', { name: '概览', exact: true }).click()
    await expect(panel).toContainText('已读取 2 条用量记录')
    await expect(
      page.getByTestId('usage-overview-pane').locator('[data-forflow-usage-cost]')
    ).toHaveCount(1)
    await expect(
      page.getByTestId('usage-overview-pane').locator('[data-forflow-usage-evidence]')
    ).toHaveCount(1)
    await page.getByTestId('usage-overview-pane').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(evidence, 'usage-integrated-light.png'),
      animations: 'disabled'
    })
    await panel.getByRole('button', { name: '模型调用审计详情' }).click()
    await expect(panel.getByLabel('模型调用审计证据')).toContainText('用量记录数不等于调用次数')
    await page.screenshot({
      path: path.join(evidence, 'usage-integrated-expanded.png'),
      animations: 'disabled'
    })
    await page.getByRole('button', { name: '外观', exact: true }).click()
    await page
      .getByRole('radiogroup', { name: '主题', exact: true })
      .getByRole('radio', { name: '深色', exact: true })
      .click()
    await page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 800))
    await panel.scrollIntoViewIfNeeded()
    await expect(panel).toBeInViewport()
    await panel.getByText('未接入', { exact: true }).last().scrollIntoViewIfNeeded()
    await expect(panel.getByText('未接入', { exact: true }).last()).toBeInViewport()
    await page.screenshot({
      path: path.join(evidence, 'usage-integrated-dark-narrow.png'),
      animations: 'disabled'
    })
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await panel.getByRole('button', { name: '数据读取审计详情' }).click()
    await expect(panel.getByLabel('数据读取审计证据')).toBeVisible()
    await cost.getByRole('button', { name: /费用口径/ }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitemradio', { name: '不可计量', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((w) => w.isVisible())
      )
    ).toBe(false)
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'usage-evidence.json'),
      JSON.stringify(
        {
          packageFingerprint,
          success: true,
          fixture: true,
          assertions: [
            'embedded in overview metrics',
            'four cost modes',
            'collapsed and exclusive audit details',
            'local log scan',
            'mixed pricing gap',
            'scope and date filters',
            'no data evidence',
            'keyboard operation',
            'light and narrow dark',
            'hidden windows'
          ],
          summary
        },
        null,
        2
      )
    )
  } finally {
    await closeElectronAppForE2E(app)
    cleanupE2EDaemons(profile)
  }
})
