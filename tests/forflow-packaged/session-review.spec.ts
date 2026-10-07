import { test, expect } from '@stablyai/playwright-test'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

function seed(profile: string): string {
  const dir = path.join(profile, 'home', '.codex', 'sessions')
  mkdirSync(dir, { recursive: true })
  for (let i = 0; i < 24; i++) {
    const id = `review-${i}`
    const day = new Date()
    day.setDate(day.getDate() - (i % 7))
    const timestamp = day.toISOString()
    const cwd = path.join(profile, 'folder-project')
    const tokens = {
      input_tokens: (i + 1) * 1000,
      cached_input_tokens: (i + 1) * 250,
      output_tokens: 250,
      total_tokens: (i + 1) * 1000 + 250
    }
    const records = [
      { type: 'session_meta', payload: { id, cwd } },
      { timestamp, type: 'turn_context', payload: { cwd, model: 'gpt-5', turn_id: 'turn-1' } },
      {
        timestamp,
        type: 'token_usage_record',
        payload: { session_id: id, response_id: `response-${id}`, usage: tokens }
      },
      {
        timestamp,
        type: 'response_item',
        payload: {
          type: 'function_call',
          call_id: `call-${id}`,
          name: 'exec',
          arguments: 'Bearer abc123-private-token owner@example.com'
        }
      },
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
  return path.join(dir, 'rollout-review-23.jsonl')
}

test('Analytics to Review: persisted anchored decisions, source changes, history and confirmation', async () => {
  const profile = privateProfile('session-review')
  const source = seed(profile)
  const { app, page, errors } = await launch(profile)
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 1150))
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
    const provider = page.getByRole('button', { name: /使用情况分析提供商/ })
    await provider.click()
    await page.getByRole('menuitem', { name: 'Codex', exact: true }).click()
    await page.getByRole('switch', { name: /启用 Codex/ }).click()
    await page.getByRole('button', { name: 'Codex 使用量选项', exact: true }).click()
    await page.getByRole('menuitemradio', { name: '所有本地 Codex 使用情况', exact: true }).click()
    await provider.click()
    await page.getByRole('menuitem', { name: '概览', exact: true }).click()
    const overview = page.getByTestId('usage-overview-pane')
    await expect(overview).toContainText('每日强度')
    await expect(overview).toContainText('token分布')
    await overview.getByText('每日强度', { exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(evidence, 'overview-original-charts.png'),
      animations: 'disabled'
    })
    await page.getByRole('tab', { name: '使用分析', exact: true }).click()
    const analytics = page.getByTestId('codex-analytics')
    await analytics.getByRole('combobox', { name: '范围', exact: true }).click()
    await page.getByRole('option', { name: '所有本地 Codex 使用情况', exact: true }).click()
    await expect(analytics.locator('tr[data-session-id]')).toHaveCount(5)
    await analytics.getByRole('button', { name: '显示更多', exact: true }).first().click()
    await expect(analytics.locator('tr[data-session-id]')).toHaveCount(20)
    await analytics.getByRole('button', { name: '下一页', exact: true }).click()
    await expect(analytics.locator('tr[data-session-id]')).toHaveCount(4)
    await analytics.getByRole('button', { name: '上一页', exact: true }).click()
    await expect(analytics.locator('tbody tr').first()).toContainText('review-23')
    await analytics.getByRole('tab', { name: '过去 7 天', exact: true }).click()
    await expect(
      analytics.getByTestId('codex-usage-history').getByRole('button', { name: /tokens$/ })
    ).toHaveCount(7)
    await analytics.getByRole('tab', { name: '过去 30 天', exact: true }).click()
    await expect(
      analytics.getByTestId('codex-usage-history').getByRole('button', { name: /tokens$/ })
    ).toHaveCount(30)
    await analytics.getByRole('tab', { name: '过去 7 天', exact: true }).click()
    await expect(analytics.locator('tr[data-session-id]')).toHaveCount(5)
    await page
      .getByRole('heading', { name: '统计和使用情况', exact: true })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(evidence, 'analytics-history-light.png'),
      animations: 'disabled'
    })
    await analytics.getByRole('textbox', { name: '搜索会话、项目或模型' }).fill('review-23')
    await expect(analytics.locator('tbody tr')).toHaveCount(1)
    if (
      (await analytics
        .getByRole('button', { name: 'review-23', exact: true })
        .getAttribute('aria-expanded')) !== 'true'
    ) {
      await analytics.getByRole('button', { name: 'review-23', exact: true }).press('Enter')
    }
    await expect(analytics.getByRole('button', { name: 'review-23', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    await page.screenshot({
      path: path.join(evidence, 'analytics-expanded-light.png'),
      animations: 'disabled'
    })
    await analytics.getByRole('button', { name: '发起审阅', exact: true }).click()
    const review = page.getByTestId('codex-review')
    await expect(review).toContainText('review-23')
    await expect(page.getByRole('tab', { name: '审阅', exact: true })).toHaveAttribute(
      'data-state',
      'active'
    )
    await review.getByRole('tab', { name: '记录', exact: true }).click()
    const row = review.locator('tr').filter({ hasText: 'call-review-23' })
    await expect(row).toContainText('未观察到')
    await row.getByRole('button', { name: '本机查看来源', exact: true }).click()
    await expect(review.locator('pre')).toContainText('[redacted]')
    await expect(review.locator('pre')).not.toContainText('owner@example.com')
    await row.getByRole('button', { name: '标记问题', exact: true }).click()
    await review.getByRole('textbox', { name: '问题标题', exact: true }).fill('检查执行结果')
    await review
      .getByRole('textbox', { name: '依据与建议下一步', exact: true })
      .fill('当前片段没有返回，补充后复查。')
    await review.getByRole('button', { name: '登记问题', exact: true }).click()
    await expect(review.getByRole('heading', { name: '检查执行结果', exact: true })).toBeVisible()
    await expect(review.getByRole('button', { name: '确认此版本', exact: true })).toBeDisabled()
    await review.getByRole('tab', { name: '概览与活动', exact: true }).click()
    await review
      .getByRole('textbox', { name: '补充背景、讨论或解释例外' })
      .fill('只审阅当前可见片段。')
    await review.getByRole('button', { name: '保存评论', exact: true }).click()
    await expect(review).toContainText('只审阅当前可见片段。')
    await review.getByRole('button', { name: '返回使用分析', exact: true }).click()
    await expect(analytics.getByRole('textbox', { name: '搜索会话、项目或模型' })).toHaveValue(
      'review-23'
    )
    await page.reload()
    await page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
    await page.getByRole('tab', { name: '使用分析', exact: true }).click()
    await analytics.getByRole('combobox', { name: '范围', exact: true }).click()
    await page.getByRole('option', { name: '所有本地 Codex 使用情况', exact: true }).click()
    await analytics.getByRole('tab', { name: '过去 7 天', exact: true }).click()
    await analytics.getByRole('textbox', { name: '搜索会话、项目或模型' }).fill('review-23')
    if (
      (await analytics
        .getByRole('button', { name: 'review-23', exact: true })
        .getAttribute('aria-expanded')) !== 'true'
    ) {
      await analytics.getByRole('button', { name: 'review-23', exact: true }).click()
    }
    await analytics.getByRole('button', { name: '打开审阅', exact: true }).click()
    await expect(review).toContainText('检查执行结果')
    await review.getByRole('button', { name: '查看材料', exact: true }).click()
    await expect(row).toBeVisible()
    await review.getByRole('tab', { name: /发现的问题/ }).click()
    await review.getByRole('button', { name: '驳回', exact: true }).click()
    await review
      .getByRole('textbox', { name: '填写复查依据或例外说明' })
      .fill('这是已注明的来源范围缺口，后续返回另行审阅。')
    await review.getByRole('button', { name: '保存处理', exact: true }).click()
    await review.getByRole('button', { name: '确认此版本', exact: true }).click()
    await expect(review).toContainText('已确认指定版本')
    appendFileSync(
      source,
      `${JSON.stringify({ timestamp: new Date().toISOString(), type: 'response_item', payload: { type: 'function_call_output', call_id: 'call-review-23', output: 'result now visible' } })}\n`
    )
    await review.getByRole('button', { name: '更新材料内容', exact: true }).click()
    await expect(review.getByRole('combobox', { name: '版本', exact: true })).toContainText('v2')
    await expect(review.getByRole('button', { name: '确认此版本', exact: true })).toBeDisabled()
    await review.getByRole('tab', { name: '概览与活动', exact: true }).click()
    await expect(review).toContainText('原处理决定保留在活动记录中')
    await expect(review).toContainText('这是已注明的来源范围缺口，后续返回另行审阅。')
    await review.getByRole('tab', { name: '版本变化', exact: true }).click()
    await expect(review).toContainText('变化记录 · 1')
    await expect(review).toContainText('call-review-23')
    await review.getByRole('button', { name: '返回使用分析', exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(evidence, 'review-version-changes-light.png'),
      animations: 'disabled'
    })
    await review.getByRole('combobox', { name: '版本', exact: true }).click()
    await page.getByRole('option', { name: /^v1/ }).click()
    await expect(review.getByRole('button', { name: '确认此版本', exact: true })).toBeDisabled()
    await review.getByRole('tab', { name: '记录', exact: true }).click()
    await expect(row).toContainText('未观察到')
    await review.getByRole('combobox', { name: '版本', exact: true }).click()
    await page.getByRole('option', { name: /^v2/ }).click()
    await expect(row).toContainText('已找到')
    await row.getByRole('button', { name: '查看结果', exact: true }).click()
    await expect(review.locator('pre')).toContainText('result now visible')
    await review.getByRole('tab', { name: /发现的问题/ }).click()
    await review.getByRole('button', { name: '复查后解决', exact: true }).click()
    await review
      .getByRole('textbox', { name: '填写复查依据或例外说明' })
      .fill('已在 v2 回读补充的执行返回。')
    await review.getByRole('button', { name: '保存处理', exact: true }).click()
    await review.getByRole('button', { name: '确认此版本', exact: true }).click()
    await expect(review).toContainText('已确认指定版本')
    await page.getByRole('button', { name: '外观', exact: true }).click()
    await page
      .getByRole('radiogroup', { name: '主题', exact: true })
      .getByRole('radio', { name: '深色', exact: true })
      .click()
    await page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
    await page.getByRole('tab', { name: '使用分析', exact: true }).click()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 800))
    await analytics.getByRole('textbox', { name: '搜索会话、项目或模型' }).fill('review-23')
    if (
      (await analytics
        .getByRole('button', { name: 'review-23', exact: true })
        .getAttribute('aria-expanded')) !== 'true'
    ) {
      await analytics.getByRole('button', { name: 'review-23', exact: true }).click()
    }
    expect(await analytics.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true
    )
    await page.getByRole('tab', { name: '使用分析', exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(evidence, 'analytics-narrow-dark.png'),
      animations: 'disabled'
    })
    await analytics.getByRole('button', { name: '打开审阅', exact: true }).click()
    expect(await review.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true
    )
    await review.getByRole('button', { name: '返回使用分析', exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(evidence, 'review-narrow-dark.png'),
      animations: 'disabled'
    })
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().every((window) => !window.isVisible())
      )
    ).toBe(true)
    const ledger = JSON.parse(
      readFileSync(path.join(profile, 'forflow-session-reviews.json'), 'utf8')
    )
    expect(ledger.reviews[0].versions).toHaveLength(2)
    expect(ledger.reviews[0].comments).toHaveLength(4)
    expect(ledger.reviews[0].confirmations).toHaveLength(2)
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'session-review-proof.json'),
      JSON.stringify(
        {
          packageFingerprint,
          profile,
          source,
          versions: 2,
          confirmations: 2,
          hiddenWindows: true,
          pageErrors: errors
        },
        null,
        2
      )
    )
  } catch (error) {
    await page.screenshot({
      path: path.join(evidence, 'session-review-failure.png'),
      animations: 'disabled'
    })
    writeFileSync(
      path.join(evidence, 'session-review-failure.txt'),
      await page.locator('body').innerText()
    )
    throw error
  } finally {
    await closeElectronAppForE2E(app)
    cleanupE2EDaemons(profile)
  }
})
