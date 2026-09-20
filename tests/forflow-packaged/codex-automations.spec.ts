import { test, expect } from '@stablyai/playwright-test'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { stringify } from 'smol-toml'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('Codex automation definitions: local read-only list, details, refresh and partial recovery', async () => {
  const profile = privateProfile('codex-automations')
  const root = path.join(profile, 'home', '.codex', 'automations')
  const cron = path.join(root, 'daily', 'automation.toml')
  const follow = path.join(root, 'follow', 'automation.toml')
  for (const file of [cron, follow]) {
    mkdirSync(path.dirname(file), { recursive: true })
  }
  const original = stringify({
    version: 1,
    id: 'daily',
    name: 'Codex 每日资料复核',
    prompt: '核对资料，保留来源。',
    status: 'ACTIVE',
    kind: 'cron',
    rrule: 'RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA;BYHOUR=9;BYMINUTE=30',
    cwds: [path.join(profile, '项目目录')],
    updated_at: 200
  })
  writeFileSync(cron, original)
  writeFileSync(
    follow,
    stringify({
      version: 1,
      id: 'follow',
      name: 'Codex 会话跟进',
      prompt: '等待检查结果',
      kind: 'heartbeat',
      status: 'PAUSED',
      target_thread_id: 'fixture-thread',
      rrule: 'FREQ=HOURLY;INTERVAL=1;BYMINUTE=0,30;BYSECOND=0',
      updated_at: 100
    })
  )
  const { app, page, errors } = await launch(profile)
  try {
    const result = await page.evaluate(() => window.api.automations.listLocalCodex())
    expect(result.status).toBe('ready')
    expect(result.automations).toHaveLength(2)
    expect(result.sourceDirectory).toBe(root)
    await page.getByRole('button', { name: '自动化', exact: true }).click()
    await page.getByRole('tab', { name: 'Codex（本机，只读）', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Codex 本机自动化' })
    await expect(panel).toContainText('Codex 每日资料复核')
    await expect(panel).toContainText('已启用')
    await expect(panel).toContainText('已暂停')
    await expect(panel).not.toContainText('无效的计划')
    await panel.locator('summary').first().click()
    await expect(panel.getByText('核对资料，保留来源。', { exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: /运行|删除|暂停/ })).toHaveCount(0)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 820))
    await expect
      .poll(() => panel.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeLessThanOrEqual(1)
    await page.screenshot({ path: path.join(evidence, 'codex-automations.png') })
    await panel.getByRole('textbox').fill('每日')
    await expect(panel).not.toContainText('Codex 会话跟进')
    await panel.getByRole('textbox').fill('')
    expect(readFileSync(cron, 'utf8')).toBe(original)
    writeFileSync(follow, 'prompt = "private-parser-error')
    await panel.getByRole('button', { name: '刷新', exact: true }).click()
    await expect(panel.getByRole('alert')).toContainText('配置格式无法识别')
    await expect(panel).toContainText('Codex 每日资料复核')
    await expect(panel).not.toContainText('private-parser-error')
    rmSync(follow)
    await panel.getByRole('button', { name: '刷新', exact: true }).click()
    await expect(panel.getByRole('alert')).toHaveCount(0)
    await page.getByRole('tab', { name: 'Forflow One', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Codex 本机自动化' })).toHaveCount(0)
    await page.getByRole('tab', { name: 'Codex（本机，只读）', exact: true }).click()
    await expect(panel).toContainText('Codex 每日资料复核')
    expect(readFileSync(cron, 'utf8')).toBe(original)
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((w) => w.isVisible())
      )
    ).toBe(false)
    writeFileSync(
      path.join(evidence, 'codex-automations.json'),
      JSON.stringify(
        {
          packageFingerprint,
          scope: 'isolated-local-fixtures',
          initialCount: 2,
          refreshCount: 1,
          partialRecovery: true,
          definitionsUnchangedByApp: true,
          errors
        },
        null,
        2
      )
    )
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
