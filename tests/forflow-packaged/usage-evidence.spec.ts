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

test('usage evidence: real local scan, missing price, source filters and four audit dimensions', async () => {
  const profile = privateProfile('usage-evidence')
  seedUsage(profile, 'known-model', 'gpt-5')
  const { app, page, errors } = await launch(profile)
  try {
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
    const providerMenu = page.getByRole('button', { name: /使用情况分析提供商/ })
    await providerMenu.click()
    await page.getByRole('menuitem', { name: 'Codex', exact: true }).click()
    const panel = page.locator('[data-forflow-usage-evidence]')
    await expect(panel).toContainText('未启用')
    await expect(panel).toContainText('尚无法判断')
    await page.getByRole('switch', { name: /启用 Codex/ }).click()
    const filters = page.getByRole('button', { name: 'Codex 使用量选项', exact: true })
    await filters.click()
    await page.getByRole('menuitemradio', { name: '所有本地 Codex 使用情况', exact: true }).click()
    await expect(panel).toContainText('1 条计量事件')
    await expect(panel.locator('[data-cost-basis="estimated"]')).toContainText('USD')
    seedUsage(profile, 'unknown-model', 'unpriced-private-model')
    await page.getByRole('button', { name: '刷新 Codex 使用量', exact: true }).click()
    await expect(panel).toContainText('2 条计量事件')
    await expect(panel.locator('[data-cost-basis="unmetered"]')).toContainText(
      '1 条记录缺少可用价格或金额'
    )
    await expect(panel.locator('[data-cost-basis="settled"]')).toContainText('未接入账单')
    await expect(panel.locator('[data-cost-basis="allocated"]')).toContainText('未配置分摊')
    for (const name of ['上下文', '模型调用', '工具调用', '数据读取']) {
      await expect(
        panel
          .getByLabel('审计覆盖明细')
          .locator('p')
          .filter({ hasText: new RegExp(`^${name}`) })
      ).toBeVisible()
    }
    const summary = await page.evaluate(() =>
      window.api.codexUsage.getSummary({ scope: 'all', range: '30d' })
    )
    expect(summary.costCoverage).toEqual({
      pricedRecords: 1,
      unpricedRecords: 1,
      unclassifiedRecords: 0
    })
    await panel.screenshot({
      path: path.join(evidence, 'usage-evidence-light.png'),
      animations: 'disabled'
    })
    await filters.click()
    await page.getByRole('menuitemradio', { name: '仅 Forflow One 工作树', exact: true }).click()
    await expect(panel).toContainText('0 条计量事件')
    await expect(panel).toContainText('暂无可计量金额')
    await providerMenu.click()
    await page.getByRole('menuitem', { name: '概览', exact: true }).click()
    await expect(panel).toContainText('Claude')
    await expect(panel).toContainText('OpenCode')
    await page.getByRole('button', { name: '外观', exact: true }).click()
    await page
      .getByRole('radiogroup', { name: '主题', exact: true })
      .getByRole('radio', { name: '深色', exact: true })
      .click()
    await page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 720))
    await panel.screenshot({
      path: path.join(evidence, 'usage-evidence-dark.png'),
      animations: 'disabled'
    })
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
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
            'local log scan',
            'mixed pricing gap',
            'scope isolation',
            'read-only cost bases',
            'four audit dimensions',
            'light and dark',
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
