import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { createAilyCliFixture } from './aily-cli-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('aily: personal partner, history, draft retention, send and reply', async () => {
  const profile = privateProfile('aily-chat')
  const cli = createAilyCliFixture(profile)
  const { app, page, errors } = await launch(profile, {
    PATH: `${cli.bin}${path.delimiter}${process.env.PATH}`
  })
  try {
    await page.getByRole('button', { name: '豆包工作伙伴', exact: true }).click()
    const panel = page.getByTestId('forflow-aily-page')
    await expect(panel).toContainText('连接我的智能伙伴')
    await page.screenshot({ path: path.join(evidence, 'aily-connect.png') })
    await panel.getByRole('button', { name: '连接我的智能伙伴', exact: true }).click()
    await expect(panel).toContainText('示例用户的智能伙伴')
    await expect(panel).toContainText('明确评审目标')
    const draft = panel.getByRole('textbox')
    await draft.fill('整理成会议议程，控制在 30 分钟内。')
    await page.getByRole('button', { name: '任务', exact: true }).click()
    await page.getByRole('button', { name: '豆包工作伙伴', exact: true }).click()
    await expect(draft).toHaveValue('整理成会议议程，控制在 30 分钟内。')
    await panel.getByRole('button', { name: '加载更早的消息', exact: true }).click()
    await expect(panel).toContainText('上次评审已完成')
    await panel.getByRole('button', { name: '刷新', exact: true }).click()
    await expect(panel.getByRole('button', { name: '加载更早的消息' })).toHaveCount(0)
    await page.screenshot({ path: path.join(evidence, 'aily-conversation.png') })
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 820))
    await panel.getByRole('button', { name: '发送', exact: true }).click()
    await expect(draft).toHaveValue('')
    await expect(panel).toContainText('已整理成会议议程')
    const calls: string[][] = readFileSync(cli.ledger, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    expect(calls.filter((args) => args.includes('+messages-send'))).toHaveLength(1)
    expect(calls.find((args) => args.includes('+messages-send'))).toContain('oc_partner')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 820))
    await expect
      .poll(() => panel.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeLessThanOrEqual(1)
    await page.screenshot({ path: path.join(evidence, 'aily-reply-compact.png') })
    await page.reload()
    await page.getByRole('button', { name: '豆包工作伙伴', exact: true }).click()
    await expect(panel).toContainText('已整理成会议议程')
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '外观', exact: true }).click()
    await page.getByRole('radio', { name: '深色', exact: true }).first().click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: '返回应用', exact: true }).click()
    await expect(panel).toContainText('已整理成会议议程')
    await page.screenshot({ path: path.join(evidence, 'aily-dark.png') })
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((w) => w.isVisible())
      )
    ).toBe(false)
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'aily-chat.json'),
      JSON.stringify(
        {
          packageFingerprint,
          simulated: true,
          persistedConnection: true,
          draftRetained: true,
          sendCount: 1,
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
