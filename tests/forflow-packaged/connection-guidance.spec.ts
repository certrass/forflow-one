import { test, expect, type Page } from '@stablyai/playwright-test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createAilyCliFixture } from './aily-cli-fixture'
import { createFeishuCliFixture } from './feishu-cli-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

async function openSettings(page: Page, section: string, search: string): Promise<void> {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: section, exact: true }).click()
  await page.getByPlaceholder('搜索设置', { exact: true }).fill(search)
}

test('choose a Feishu partner by name and resume it in the standard agent chat', async () => {
  const profile = privateProfile('partner-guidance')
  const fixture = createAilyCliFixture(profile, true)
  const packageBin = path.join(process.env.FORFLOW_PACKAGED_APP!, 'Contents/Resources/bin')
  const shellPath = [fixture.bin, packageBin, process.env.PATH].join(path.delimiter)
  mkdirSync(path.join(profile, 'home'), { recursive: true })
  writeFileSync(
    path.join(profile, 'home', '.zprofile'),
    `export PATH='${shellPath.replaceAll("'", "'\\''")}'\n`
  )
  const profileFile = path.join(profile, 'orca-data.json')
  const seed = JSON.parse(readFileSync(profileFile, 'utf8'))
  seed.settings.agentDefaultEnv = { aily: { HOME: path.join(profile, 'home'), PATH: shellPath } }
  writeFileSync(profileFile, JSON.stringify(seed))
  const { app, page, errors } = await launch(profile, {
    PATH: shellPath,
    ORCA_DISABLE_MACOS_LOGIN_SHELL: '1'
  })
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1200, 850))
    await addPrivateProject(page, profile)
    await openSettings(page, '智能体', '连接智能伙伴')
    const section = page.getByTestId('forflow-domestic-connections')
    await expect(section).toContainText('已找到连接工具')
    await expect(section.getByText('forflow aily', { exact: true })).toBeHidden()
    await page.screenshot({ animations: 'disabled', path: path.join(evidence, 'agents-after.png') })
    await section.getByRole('button', { name: '豆包工作伙伴连接指引', exact: true }).click()
    await section.getByRole('button', { name: '查找飞书伙伴', exact: true }).click()
    await expect(section.getByRole('button', { name: '连接所选伙伴' })).toBeDisabled()
    await section.getByRole('combobox', { name: '飞书中的伙伴' }).click()
    await expect(page.getByRole('option', { name: '项目小组的工作伙伴' })).toBeVisible()
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, 'aily-choose-partner.png')
    })
    await page.getByRole('option', { name: '示例用户的智能伙伴', exact: true }).click()
    await section.getByRole('button', { name: '连接所选伙伴' }).click()
    await expect(section).toContainText('已连接 · 示例用户的智能伙伴')
    const bindingFile = path.join(
      profile,
      'home',
      '.forflow-one',
      'companions',
      'aily',
      'forflow-aily-connection.json'
    )
    expect(JSON.parse(readFileSync(bindingFile, 'utf8')).partner.chatId).toBe('oc_partner')
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, 'aily-connected.png')
    })
    await page.getByRole('button', { name: '返回应用', exact: true }).click()
    await page.getByRole('button', { name: '新标签页', exact: true }).first().click()
    await page.getByRole('combobox').filter({ visible: true }).fill('豆包')
    await page
      .locator('#tab-create-entry-results')
      .getByRole('option')
      .filter({ hasText: '豆包工作伙伴' })
      .first()
      .click()
    const chatHint = page.getByText('点击“对话”即可启用聊天界面', { exact: true })
    const loadedReply = page
      .locator('.native-chat-pane-shell:visible')
      .last()
      .getByText('明确评审目标', { exact: true })
    await expect(chatHint.or(loadedReply)).toBeVisible()
    if (await chatHint.isVisible()) {
      await page.getByRole('button', { name: '对话', exact: true }).click()
    }
    await expect(page.locator('.native-chat-pane-shell:visible').last()).toContainText(
      '明确评审目标'
    )
    const calls = readFileSync(fixture.ledger, 'utf8')
    expect(calls).not.toContain('+messages-send')
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, 'aily-continue-chat.png')
    })
    const windows = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().map((w) => ({ visible: w.isVisible(), focused: w.isFocused() }))
    )
    expect(windows.every((w) => !w.visible && !w.focused)).toBe(true)
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'aily-guidance-qa.json'),
      JSON.stringify(
        {
          packageFingerprint,
          synthetic: true,
          cases: [
            'multiple partners',
            'explicit choice',
            'shared CLI binding',
            'native chat resumes selected conversation'
          ],
          sentMessages: false,
          windows,
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

test('Feishu setup, retry, connected actions and task entry stay readable', async () => {
  const profile = privateProfile('feishu-guidance')
  const fixture = createFeishuCliFixture(profile)
  const { app, page, errors } = await launch(profile, {
    PATH: `${fixture.bin}${path.delimiter}${process.env.PATH}`,
    ORCA_DISABLE_MACOS_LOGIN_SHELL: '1'
  })
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1200, 850))
    await openSettings(page, '集成', '飞书')
    const card = page.locator('[data-settings-section="forflow-feishu"]')
    await expect(card).toHaveCount(1)
    await expect(card).toContainText('未连接')
    await expect(card.getByText('lark-cli config init', { exact: true })).toBeHidden()
    await page.screenshot({ animations: 'disabled', path: path.join(evidence, 'feishu-after.png') })
    writeFileSync(fixture.state, 'not_configured')
    await card.getByRole('button', { name: '连接飞书', exact: true }).click()
    await expect(card.getByRole('alert')).toContainText('首次连接')
    await card.getByRole('button', { name: '首次连接', exact: true }).click()
    await expect(card).toContainText('1. 安装连接工具 · 已安装')
    await expect(card.getByRole('textbox', { name: '应用 ID' })).toBeHidden()
    await page.screenshot({ animations: 'disabled', path: path.join(evidence, 'feishu-setup.png') })
    writeFileSync(fixture.state, 'ready')
    await card.getByRole('button', { name: '连接飞书', exact: true }).click()
    await expect(card).toContainText('已连接')
    await expect(card).toContainText('隔离测试用户')
    await expect(card.getByRole('button', { name: '断开连接' })).toBeHidden()
    await page.evaluate(() => window.api.settings.set({ theme: 'dark' }))
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: '集成', exact: true }).click()
    await page.getByPlaceholder('搜索设置', { exact: true }).fill('飞书')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 740))
    await expect(card).toContainText('已连接')
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, 'feishu-connected-dark.png')
    })
    expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    await card.getByRole('button', { name: '查看任务', exact: true }).click()
    await page.getByRole('button', { name: '读取任务', exact: true }).click()
    await expect(page.getByText('修复任务登录流程', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '连接飞书', exact: true })).toHaveCount(0)
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'feishu-guidance-qa.json'),
      JSON.stringify(
        {
          packageFingerprint,
          synthetic: true,
          cases: [
            'collapsed setup',
            'configuration error',
            'retry',
            'connected actions',
            'dark and narrow layout',
            'task browser'
          ],
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
