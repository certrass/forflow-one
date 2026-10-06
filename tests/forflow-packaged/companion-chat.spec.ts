import { test, expect } from '@stablyai/playwright-test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createAilyCliFixture } from './aily-cli-fixture'
import { createWorkBuddyCliFixture } from './workbuddy-cli-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

for (const agent of ['aily', 'workbuddy'] as const) {
  test(`${agent}: standard agent picker, native chat, multiline send and draft retention`, async () => {
    const profile = privateProfile(`${agent}-native`)
    const aily = createAilyCliFixture(profile)
    const workbuddy = createWorkBuddyCliFixture(profile)
    const packageBin = path.join(process.env.FORFLOW_PACKAGED_APP!, 'Contents/Resources/bin')
    mkdirSync(path.join(profile, 'home'), { recursive: true })
    const shellPath = [aily.bin, packageBin, process.env.PATH].join(path.delimiter)
    writeFileSync(
      path.join(profile, 'home', '.zprofile'),
      `export PATH='${shellPath.replaceAll("'", "'\\''")}'\n`
    )
    const profilePath = path.join(profile, 'orca-data.json')
    const seed = JSON.parse(readFileSync(profilePath, 'utf8'))
    seed.settings.agentDefaultEnv = {
      [agent]: { HOME: path.join(profile, 'home'), PATH: shellPath }
    }
    writeFileSync(profilePath, JSON.stringify(seed))
    const { app, page, errors } = await launch(profile, {
      PATH: `${aily.bin}${path.delimiter}${packageBin}${path.delimiter}${process.env.PATH}`,
      FORFLOW_WORKBUDDY_CLI: workbuddy.program,
      // login(1) restores the real account HOME even for an isolated Electron profile.
      ORCA_DISABLE_MACOS_LOGIN_SHELL: '1'
    })
    try {
      await addPrivateProject(page, profile)
      writeFileSync(
        path.join(evidence, `${agent}-detection.json`),
        JSON.stringify({
          ids: await page.evaluate(() => window.api.preflight.detectAgents())
        })
      )
      await expect(page.getByTestId('forflow-aily-page')).toHaveCount(0)
      await page.getByRole('button', { name: '新标签页', exact: true }).first().click()
      const picker = page.getByRole('combobox').filter({ visible: true })
      await picker.fill(agent === 'aily' ? '豆包' : 'WorkBuddy')
      await expect(page.locator('#tab-create-entry-results')).toContainText(
        agent === 'aily' ? '豆包工作伙伴' : 'WorkBuddy'
      )
      await page.screenshot({ path: path.join(evidence, `${agent}-picker.png`) })
      await page
        .locator('#tab-create-entry-results')
        .getByRole('option')
        .filter({ hasText: agent === 'aily' ? '豆包工作伙伴' : 'WorkBuddy' })
        .first()
        .click()
      const chat = page.locator('.native-chat-pane-shell:visible').last()
      await expect(chat).toBeVisible()
      if (agent === 'aily') {
        await expect(chat).toContainText('明确评审目标')
        const history = await chat.innerText()
        expect(history.indexOf('帮我整理产品评审会')).toBeLessThan(history.indexOf('明确评审目标'))
      }
      if (agent === 'workbuddy') {
        await expect.poll(() => readFileSync(workbuddy.ledger, 'utf8')).toContain('session/new')
      }
      const composer = chat.locator('[contenteditable="true"]').first()
      await composer.fill('整理这次产品评审的任务')
      await composer.press('Shift+Enter')
      await composer.pressSequentially('分成三个步骤')
      await chat.getByRole('button', { name: '发送', exact: true }).click()
      await expect(chat).toContainText(agent === 'aily' ? '已整理成会议议程' : '已整理好任务步骤')
      await composer.fill('下一步请细化材料清单')
      await page.getByRole('button', { name: '任务', exact: true }).click()
      await page.locator('[role="option"][data-worktree-id]').first().click()
      await expect(composer).toContainText('下一步请细化材料清单')
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1080, 820))
      await page.screenshot({ path: path.join(evidence, `${agent}-native-chat.png`) })
      if (agent === 'workbuddy') {
        await composer.fill('需要确认的测试操作')
        await chat.getByRole('button', { name: '发送', exact: true }).click()
        await expect(chat).toContainText('写入测试文件')
        const closeNotice = page.locator('[data-sonner-toast] [data-close-button]').first()
        if (await closeNotice.isVisible()) {
          await closeNotice.click()
          await expect(closeNotice).toBeHidden()
        }
        await page.screenshot({ path: path.join(evidence, 'workbuddy-permission.png') })
        await chat.getByText('取消本次操作', { exact: true }).click()
        await chat
          .getByRole('button', { name: /提交|发送/ })
          .last()
          .click()
        await expect(chat).toContainText('已按你的选择取消文件写入')
        expect(readFileSync(workbuddy.ledger, 'utf8')).toContain('"optionId":"deny"')
        await composer.fill('测试停止正在进行的任务')
        await chat.getByRole('button', { name: '发送', exact: true }).click()
        await chat.getByRole('button', { name: /停止/ }).click()
        await expect.poll(() => readFileSync(workbuddy.ledger, 'utf8')).toContain('session/cancel')
      }
      const calls = readFileSync(agent === 'aily' ? aily.ledger : workbuddy.ledger, 'utf8')
      const sends = calls
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
        .filter((value) =>
          agent === 'aily' ? value.includes('+messages-send') : value.method === 'session/prompt'
        )
      expect(sends).toHaveLength(agent === 'aily' ? 1 : 3)
      expect(JSON.stringify(sends)).toContain('分成三个步骤')
      expect(calls).not.toContain('下一步请细化材料清单')
      expect(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows().some((w) => w.isVisible())
        )
      ).toBe(false)
      expect(errors).toEqual([])
      writeFileSync(
        path.join(evidence, `${agent}-native-chat.json`),
        JSON.stringify(
          {
            packageFingerprint,
            simulated: true,
            standardAgentPicker: true,
            nativeChat: true,
            sends: sends.length,
            draftRetained: true,
            errors
          },
          null,
          2
        )
      )
    } catch (error) {
      writeFileSync(
        path.join(evidence, `${agent}-failure.txt`),
        await page.locator('body').innerText()
      )
      await page.screenshot({ path: path.join(evidence, `${agent}-failure.png`) })
      await page
        .getByRole('button', { name: '终端', exact: true })
        .click()
        .catch(() => {})
      await page.screenshot({ path: path.join(evidence, `${agent}-terminal-failure.png`) })
      throw error
    } finally {
      await closeElectronAppForE2E(app)
      await cleanupE2EDaemons(profile)
    }
  })
}
