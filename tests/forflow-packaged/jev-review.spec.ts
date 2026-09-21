import { test, expect } from '@stablyai/playwright-test'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { seedJevReview } from './jev-review-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('Jev packaged review: explicit preview, one send, adoption, source, restart and version scope', async () => {
  const profile = privateProfile('jev-review')
  const source = seedJevReview(profile)
  let running = await launch(profile)
  try {
    const { app, page, errors } = running
    await app.evaluate(({ BrowserWindow, net }) => {
      BrowserWindow.getAllWindows()[0].setSize(1500, 1100)
      const original = net.fetch.bind(net)
      process.env.FORFLOW_QA_JEV_COUNT = '0'
      net.fetch = async (input, init) => {
        const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
        if (url.hostname !== 'api.typesafe.ai') {
          return original(input, init)
        }
        process.env.FORFLOW_QA_JEV_COUNT = String(Number(process.env.FORFLOW_QA_JEV_COUNT) + 1)
        if (
          init?.method !== 'POST' ||
          init.redirect !== 'error' ||
          new Headers(init.headers).get('Authorization') !== 'Bearer synthetic-jev-test-key'
        ) {
          throw new Error('Unexpected fixture request')
        }
        const request = JSON.parse(String(init.body))
        if (
          request.state.record.includes('qa@example.invalid') ||
          request.state.record.includes('synthetic-credential-never-real')
        ) {
          throw new Error('Fixture was not redacted')
        }
        const selected = { outcome: 'attention', evidence: 'sufficient', claim: 'conflict' }
        const answers = Object.fromEntries(
          Object.entries(selected)
            .filter(([key]) => request.questions[key])
            .map(([key, choice]) => [
              key,
              {
                type: 'choice',
                choice,
                confidence: 1,
                probabilities: Object.fromEntries(
                  Object.keys(request.questions[key].criteria).map((option) => [
                    option,
                    option === choice ? 1 : 0
                  ])
                )
              }
            ])
        )
        return new Response(
          JSON.stringify({
            model: request.model,
            usage: { input_tokens: 123, output_tokens: 45 },
            answers
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }
    })
    await page.evaluate(() =>
      window.api.forflowModelAccounts!.save({
        provider: 'jev',
        model: 'jev-1.13.0',
        apiKey: 'synthetic-jev-test-key'
      })
    )
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
    await page.getByTestId('usage-provider-select').click()
    await page.getByRole('menuitem', { name: 'Codex', exact: true }).click()
    await page.getByRole('switch', { name: /启用 Codex/ }).click()
    await page.getByRole('tab', { name: '使用分析', exact: true }).click()
    const analytics = page.getByTestId('codex-analytics')
    await analytics.getByRole('combobox', { name: '范围', exact: true }).click()
    await page.getByRole('option', { name: '所有本地 Codex 使用情况', exact: true }).click()
    await analytics.getByRole('button', { name: 'jev-review-qa', exact: true }).click()
    await analytics.getByRole('button', { name: '发起审阅', exact: true }).click()
    const review = page.getByTestId('codex-review')
    await expect(review.getByTestId('review-check-summary')).toContainText('此版本尚无 Jev 检查')
    await review.getByRole('tab', { name: '记录', exact: true }).click()
    const row = review.locator('tr').filter({ hasText: 'qa-failed-test' })
    await row.getByRole('button', { name: '审阅这条记录', exact: true }).click()
    const panel = page.getByTestId('jev-audit-panel')
    await panel.getByRole('textbox', { name: '待核实的主张（可选）' }).fill('全部测试已经通过。')
    await panel.getByRole('button', { name: '准备发送预览', exact: true }).click()
    const preview = panel.getByTestId('jev-request-preview')
    await expect(preview).toContainText('2 项通过，1 项失败')
    await expect(preview).not.toContainText('qa@example.invalid')
    await expect(preview).not.toContainText('synthetic-credential-never-real')
    expect(await app.evaluate(() => process.env.FORFLOW_QA_JEV_COUNT)).toBe('0')
    await page.screenshot({
      path: path.join(evidence, 'jev-request-preview.png'),
      animations: 'disabled'
    })
    await panel.getByRole('button', { name: '将此预览发送至 Jev', exact: true }).click()
    await expect(panel).toContainText('主张与所选证据冲突')
    expect(await app.evaluate(() => process.env.FORFLOW_QA_JEV_COUNT)).toBe('1')
    const first = JSON.parse(readFileSync(path.join(profile, 'forflow-jev-audit.json'), 'utf8'))
      .receipts[0]
    expect(first.questionVersion).toBe('forflow-review-v2')
    await page.evaluate(
      ({ id, inputHash }) => window.api.forflowJevAudit!.run({ id, inputHash }),
      first
    )
    expect(await app.evaluate(() => process.env.FORFLOW_QA_JEV_COUNT)).toBe('1')
    await panel.getByRole('button', { name: '加入 Issues', exact: true }).last().click()
    await expect(panel.getByRole('button', { name: '已加入 Issues', exact: true })).toBeDisabled()
    await panel.getByRole('button', { name: '查看已登记的问题', exact: true }).click()
    await expect(review).toContainText('Jev：主张与所选记录冲突')
    await expect(review.getByRole('button', { name: '确认此版本', exact: true })).toBeDisabled()
    await review.getByRole('button', { name: '定位关联记录', exact: true }).click()
    await row.getByRole('button', { name: '查看返回记录', exact: true }).click()
    await expect(review.locator('pre')).toContainText('退出码 1')
    await review.getByRole('tab', { name: '概览与活动', exact: true }).click()
    await expect(review.getByTestId('review-check-summary')).toContainText('已完成检查 1')
    await expect(review.getByTestId('review-activity')).toContainText('Jev 记录检查')
    await review
      .getByRole('textbox', { name: '补充背景、讨论或解释例外' })
      .fill('已检查原返回，需修复重载后问题丢失，再复测。')
    await review.getByRole('button', { name: '保存评论', exact: true }).click()
    await review.getByRole('button', { name: '返回使用分析', exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(evidence, 'review-pr-overview.png'),
      animations: 'disabled'
    })
    await review.getByTestId('review-activity').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: path.join(evidence, 'review-pr-activity.png'),
      animations: 'disabled'
    })
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().every((window) => !window.isVisible())
      )
    ).toBe(true)
    await closeElectronAppForE2E(app)
    running = await launch(profile)
    await running.page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
    await running.page.getByRole('tab', { name: '使用分析', exact: true }).click()
    const resumedAnalytics = running.page.getByTestId('codex-analytics')
    await resumedAnalytics.getByRole('combobox', { name: '范围', exact: true }).click()
    await running.page.getByRole('option', { name: '所有本地 Codex 使用情况', exact: true }).click()
    await resumedAnalytics.getByRole('button', { name: 'jev-review-qa', exact: true }).click()
    await resumedAnalytics.getByRole('button', { name: '打开审阅', exact: true }).click()
    const resumedReview = running.page.getByTestId('codex-review')
    await expect(resumedReview).toContainText('已完成检查 1')
    await expect(resumedReview).toContainText('已检查原返回，需修复重载后问题丢失，再复测。')
    appendFileSync(
      source,
      `${JSON.stringify({ timestamp: new Date().toISOString(), type: 'response_item', payload: { type: 'function_call_output', call_id: 'qa-missing-return', output: '重试通过，退出码 0。' } })}\n`
    )
    await resumedReview.getByRole('button', { name: '重新读取当前记录', exact: true }).click()
    await expect(resumedReview.getByRole('combobox', { name: '版本', exact: true })).toContainText(
      'v2'
    )
    await expect(resumedReview.getByTestId('review-check-summary')).toContainText(
      '此版本尚无 Jev 检查'
    )
    await resumedReview.getByRole('combobox', { name: '版本', exact: true }).click()
    await running.page.getByRole('option', { name: /^v1/ }).click()
    await resumedReview.getByRole('tab', { name: 'Jev · Beta', exact: true }).click()
    await expect(running.page.getByTestId('jev-audit-panel')).toContainText('主张与所选证据冲突')
    await expect(
      running.page.getByRole('button', { name: '准备发送预览', exact: true })
    ).toHaveCount(0)
    await running.app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setSize(1000, 850)
    )
    expect(
      await resumedReview.evaluate((element) => element.scrollWidth <= element.clientWidth)
    ).toBe(true)
    await running.page.getByTestId('jev-audit-panel').scrollIntoViewIfNeeded()
    await running.page.screenshot({
      path: path.join(evidence, 'jev-history-narrow.png'),
      animations: 'disabled'
    })
    const ledger = JSON.parse(
      readFileSync(path.join(profile, 'forflow-session-reviews.json'), 'utf8')
    )
    expect(ledger.reviews[0].versions).toHaveLength(2)
    expect(ledger.reviews[0].issues).toHaveLength(1)
    expect(ledger.reviews[0].comments).toHaveLength(1)
    expect(running.errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'jev-review-proof.json'),
      JSON.stringify(
        {
          packageFingerprint,
          profile,
          network: 'one deterministic protocol fixture; no vendor request',
          sends: 1,
          issues: 1,
          versions: 2,
          restartReadback: true,
          historicalReadOnly: true,
          hiddenWindows: true,
          pageErrors: []
        },
        null,
        2
      )
    )
  } catch (error) {
    await running.page.screenshot({ path: path.join(evidence, 'jev-review-failure.png') })
    writeFileSync(
      path.join(evidence, 'jev-review-failure.txt'),
      await running.page.locator('body').innerText()
    )
    throw error
  } finally {
    await closeElectronAppForE2E(running.app)
    cleanupE2EDaemons(profile)
  }
})
