import { test, expect } from '@stablyai/playwright-test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createAilyCliFixture } from './aily-cli-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('Aily opens a draft during slow history sync and explains concurrent use', async () => {
  const profile = privateProfile('aily-startup')
  const gate = path.join(profile, 'history-ready')
  const fixture = createAilyCliFixture(profile, false, gate)
  const packageBin = path.join(process.env.FORFLOW_PACKAGED_APP!, 'Contents/Resources/bin')
  const isolatedHome = path.join(profile, 'home')
  mkdirSync(isolatedHome, { recursive: true })
  const shellPath = [fixture.bin, packageBin, process.env.PATH].join(path.delimiter)
  writeFileSync(
    path.join(isolatedHome, '.zprofile'),
    `export PATH='${shellPath.replaceAll("'", "'\\''")}'\n`
  )
  const profilePath = path.join(profile, 'orca-data.json')
  const seed = JSON.parse(readFileSync(profilePath, 'utf8'))
  seed.settings.agentDefaultEnv = { aily: { HOME: isolatedHome, PATH: shellPath } }
  writeFileSync(profilePath, JSON.stringify(seed))
  const { app, page, errors } = await launch(profile, {
    PATH: shellPath,
    ORCA_DISABLE_MACOS_LOGIN_SHELL: '1'
  })
  const openAily = async () => {
    await page.getByRole('button', { name: '新标签页', exact: true }).first().click()
    await page.getByRole('combobox').filter({ visible: true }).fill('豆包')
    await page
      .locator('#tab-create-entry-results')
      .getByRole('option')
      .filter({ hasText: '豆包工作伙伴' })
      .first()
      .click()
  }
  try {
    await addPrivateProject(page, profile)
    const start = Date.now()
    await openAily()
    const chat = page.locator('.native-chat-pane-shell:visible').last()
    const composer = chat.locator('[contenteditable="true"]').first()
    await expect(composer).toBeVisible({ timeout: 15_000 })
    const draftReadyMs = Date.now() - start
    await expect.poll(() => readFileSync(fixture.ledger, 'utf8')).toContain('+chat-messages-list')
    await composer.fill('等历史同步完成后再发送这条任务')
    await expect(chat).not.toContainText('明确评审目标')
    await page.screenshot({ path: path.join(evidence, 'aily-draft-while-syncing.png') })
    expect(readFileSync(fixture.ledger, 'utf8')).not.toContain('+messages-send')
    writeFileSync(gate, 'ready')
    await expect(chat).toContainText('明确评审目标')
    await expect(composer).toContainText('等历史同步完成后再发送这条任务')
    await chat.getByRole('button', { name: '发送', exact: true }).click()
    await expect(chat).toContainText('已整理成会议议程')
    await page.getByRole('button', { name: '并行与对比', exact: true }).click()
    await expect(page.locator('[data-forflow-parallel-guide]')).toContainText(
      '一次在一个任务中使用'
    )
    await page.screenshot({ path: path.join(evidence, 'aily-parallel-guidance.png') })
    await page.keyboard.press('Escape')
    await openAily()
    await expect(page.getByText('一次在一个任务中使用', { exact: false })).toBeVisible()
    await expect(page.locator('[contenteditable="true"]:visible')).toHaveCount(0)
    await page.getByRole('button', { name: '查看连接情况', exact: true }).click()
    await expect(page.getByRole('button', { name: '终端', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const result = await window.api.runtime.call({ method: 'terminal.list', params: {} })
          return result.ok ? JSON.stringify(result.result) : ''
        })
      )
      .toContain('豆包已在另一个任务中打开')
    await page.screenshot({ path: path.join(evidence, 'aily-duplicate-terminal.png') })
    const sends = readFileSync(fixture.ledger, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
      .filter((args) => args.includes('+messages-send'))
    expect(sends).toHaveLength(1)
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((w) => w.isVisible())
      )
    ).toBe(false)
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'aily-startup.json'),
      JSON.stringify(
        {
          packageFingerprint,
          simulated: true,
          draftReadyMs,
          historyHeldUntilDraftEdited: true,
          draftRetained: true,
          sends: sends.length,
          duplicateHasNoComposer: true,
          connectionDetailsAvailable: true,
          errors
        },
        null,
        2
      )
    )
  } catch (error) {
    writeFileSync(
      path.join(evidence, 'aily-startup-failure.txt'),
      await page.locator('body').innerText()
    )
    await page.screenshot({ path: path.join(evidence, 'aily-startup-failure.png') })
    throw error
  } finally {
    writeFileSync(gate, 'ready')
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
