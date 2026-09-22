import { selectReviewFiles } from './workspace-review-intake-qa'
import { test, expect } from '@stablyai/playwright-test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('delivery quality: explicit multi-source preview, native answers, adoption and stale source', async () => {
  const profile = privateProfile('jev-delivery')
  const folder = path.join(profile, 'delivery')
  mkdirSync(folder)
  writeFileSync(path.join(folder, 'requirement.md'), '新增问题后重启，标题和状态保持一致。\n')
  writeFileSync(
    path.join(folder, 'receipt.txt'),
    '版本 r1：新增问题后重启，问题为空；测试失败。\nAPI_KEY=synthetic-secret-00000000\n'
  )
  writeFileSync(
    path.join(folder, 'handoff.md'),
    '使用 r1 测试账户；新增标题为 A 的问题，重启应用，再检索 A；预期标题仍为 A。\n'
  )
  let running = await launch(profile)
  try {
    const { app, page } = running
    await app.evaluate(({ BrowserWindow, net }) => {
      BrowserWindow.getAllWindows()[0].setSize(1450, 1100)
      const original = net.fetch.bind(net)
      process.env.FORFLOW_QA_DELIVERY_SENDS = '0'
      net.fetch = async (input, init) => {
        const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
        if (url.hostname !== 'api.typesafe.ai') {
          return original(input, init)
        }
        process.env.FORFLOW_QA_DELIVERY_SENDS = String(
          Number(process.env.FORFLOW_QA_DELIVERY_SENDS) + 1
        )
        if (new Headers(init?.headers).get('Authorization') !== 'Bearer synthetic-jev-test-key') {
          throw new Error('Unexpected fixture credential')
        }
        const request = JSON.parse(String(init?.body))
        process.env.FORFLOW_QA_DELIVERY_BODY = String(init?.body)
        if (JSON.stringify(request).includes('synthetic-secret-00000000')) {
          throw new Error('Unredacted input')
        }
        const selected: Record<string, string> = {
          criterion_clarity: 'clear',
          criterion_evidence: 'unmet',
          handoff_criterion_coverage: 'partial'
        }
        const answers = Object.fromEntries(
          Object.entries(request.questions).map(([id, value]) => {
            const question = JSON.parse(JSON.stringify(value))
            if (question.type === 'noul') {
              return [id, { type: 'noul', noul: 0.97 }]
            }
            if (question.type === 'score') {
              return [
                id,
                {
                  type: 'score',
                  score: 4,
                  confidence: 0.98,
                  legend: Object.fromEntries(
                    question.criteria.map((label: string, i: number) => [String(i), label])
                  ),
                  probabilities: { '0': 0, '1': 0, '2': 0, '3': 0.01, '4': 0.99 }
                }
              ]
            }
            return [
              id,
              {
                type: 'choice',
                choice: selected[id],
                confidence: 1,
                probabilities: Object.fromEntries(
                  Object.keys(question.criteria).map((key) => [key, key === selected[id] ? 1 : 0])
                )
              }
            ]
          })
        )
        return new Response(
          JSON.stringify({
            model: request.model,
            answers,
            usage: { input_tokens: 1500, output_tokens: 180 }
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }
    })
    await page.evaluate(async (root) => {
      await window.api.forflowModelAccounts!.save({
        provider: 'jev',
        model: 'jev-1.13.0',
        apiKey: 'synthetic-jev-test-key'
      })
      const group = await window.api.projectGroups.create({
        name: '交付质量成品验证',
        parentPath: root
      })
      await window.api.folderWorkspaces.create({
        projectGroupId: group.id,
        name: '交付质量成品验证',
        folderPath: root
      })
    }, folder)
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
    await page.getByTestId('usage-provider-select').click()
    await page.getByRole('menuitem', { name: 'Codex', exact: true }).click()
    await page.getByRole('tab', { name: '审阅', exact: true }).click()
    await page.getByRole('tab', { name: '项目', exact: true }).click()
    const intake = page.getByTestId('workspace-review-intake')
    await intake.getByRole('combobox', { name: '项目', exact: true }).click()
    await page.getByPlaceholder('搜索项目').fill('交付质量成品验证')
    await page.getByRole('option').filter({ hasText: '交付质量成品验证' }).click()
    await intake
      .getByRole('textbox', { name: '检查目标', exact: true })
      .fill('新增问题后重启，标题和状态保持一致。')
    await selectReviewFiles(intake, [
      { path: 'requirement.md' },
      { path: 'handoff.md' },
      { path: 'receipt.txt', verification: true }
    ])
    await intake.getByRole('button', { name: '进入审阅', exact: true }).click()
    const review = page.getByTestId('codex-review')
    await review.getByRole('tab', { name: 'Jev · Beta', exact: true }).click()
    const panel = review.getByTestId('jev-audit-panel')
    await expect(panel.getByTestId('jev-delivery-input')).toBeVisible()
    for (const file of ['requirement.md', 'receipt.txt', 'handoff.md']) {
      await panel.getByRole('checkbox', { name: `选择证据: ${file}`, exact: true }).check()
    }
    await panel.getByRole('checkbox', { name: '作为交接说明: handoff.md', exact: true }).check()
    await panel.getByRole('button', { name: '准备发送预览', exact: true }).click()
    const preview = panel.getByTestId('jev-request-preview')
    await expect(preview).toContainText('标题和状态保持一致')
    await expect(preview).toContainText('问题为空；测试失败')
    await expect(preview).not.toContainText('synthetic-secret-00000000')
    expect(await app.evaluate(() => process.env.FORFLOW_QA_DELIVERY_SENDS)).toBe('0')
    await panel.getByRole('button', { name: '将此预览发送至 Jev', exact: true }).click()
    const results = panel.getByTestId('jev-delivery-results')
    await expect(results).toContainText('待人工复核')
    await expect(results).toContainText('有记录的当前不符合项')
    await expect(results).toContainText('交接说明可操作性')
    expect(await app.evaluate(() => process.env.FORFLOW_QA_DELIVERY_SENDS)).toBe('1')
    const ledger = JSON.parse(readFileSync(path.join(profile, 'forflow-jev-audit.json'), 'utf8'))
    const receipt = ledger.receipts[0]
    expect(receipt.mode).toBe('delivery')
    expect(receipt.evidenceKeys).toHaveLength(3)
    expect(receipt.basis.sourceFingerprints).toHaveLength(3)
    expect(receipt.basis.evaluatorVersion).toMatch(/^forflow-delivery-evaluator-v1:[a-f0-9]{64}$/)
    await page.evaluate(
      ({ id, inputHash }) => window.api.forflowJevAudit!.run({ id, inputHash }),
      receipt
    )
    expect(await app.evaluate(() => process.env.FORFLOW_QA_DELIVERY_SENDS)).toBe('1')
    await results.getByRole('button', { name: '加入 Issues', exact: true }).first().click()
    await expect(results.getByRole('button', { name: '已加入 Issues', exact: true })).toBeDisabled()
    const stored = await page.evaluate(
      (id) => window.api.codexUsage.getReview!(id),
      receipt.reviewId
    )
    expect(
      stored.issues.find((issue) => issue.detail.includes(receipt.id))?.evidenceKeys
    ).toHaveLength(3)
    expect(stored.confirmations).toHaveLength(0)
    writeFileSync(path.join(folder, 'receipt.txt'), '版本 r2：复测通过，原结果已变化。\n')
    await results.getByRole('button', { name: '加入 Issues', exact: true }).click()
    await expect(panel.getByRole('alert')).toContainText('变化')
    await page.screenshot({
      path: path.join(evidence, 'jev-delivery-results.png'),
      animations: 'disabled'
    })
    expect(running.errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().every((window) => !window.isVisible())
      )
    ).toBe(true)
    await closeElectronAppForE2E(app)
    running = await launch(profile)
    const restored = await running.page.evaluate(
      (id) => window.api.forflowJevAudit!.list(id),
      receipt.reviewId
    )
    expect(restored).toHaveLength(1)
    expect(restored[0].basis).toEqual(receipt.basis)
    expect(restored[0].result).toEqual(receipt.result)
    writeFileSync(
      path.join(evidence, 'jev-delivery-proof.json'),
      JSON.stringify(
        {
          packageFingerprint,
          profile,
          network: 'one deterministic native-protocol fixture; no vendor request',
          sends: 1,
          selectedSources: 3,
          sourceFreshnessRejected: true,
          restartReadback: true,
          humanConfirmation: false,
          hiddenWindows: true
        },
        null,
        2
      )
    )
  } catch (error) {
    await running.page.screenshot({ path: path.join(evidence, 'jev-delivery-failure.png') })
    writeFileSync(
      path.join(evidence, 'jev-delivery-failure.txt'),
      await running.page.locator('body').innerText()
    )
    throw error
  } finally {
    await closeElectronAppForE2E(running.app)
    cleanupE2EDaemons(profile)
  }
})
