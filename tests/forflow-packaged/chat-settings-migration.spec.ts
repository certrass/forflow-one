import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

for (const previousChatDefault of [false, true]) {
  test(`v222 settings migration preserves Chat default ${previousChatDefault}`, async () => {
    const profile = privateProfile(`chat-migration-${previousChatDefault}`)
    const profilePath = path.join(profile, 'orca-data.json')
    const original = JSON.parse(readFileSync(profilePath, 'utf8'))
    original.settings.experimentalNativeChat = true
    original.settings.openAgentTabsInChatByDefault = previousChatDefault
    original.settings.experimentalStructuredNativeChat = false
    writeFileSync(profilePath, JSON.stringify(original))
    const { app, page, errors } = await launch(profile)
    try {
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: '设置', exact: true }).click()
      await page.getByRole('button', { name: '实验性', exact: true }).click()
      const toggle = page.getByRole('switch', { name: '切换 Chat UI', exact: true })
      await (previousChatDefault ? expect(toggle).toBeChecked() : expect(toggle).not.toBeChecked())
      await expect(
        page.getByRole('combobox', { name: '默认 Chat UI 视图', exact: true })
      ).toHaveCount(0)
      await expect(
        page.getByRole('switch', { name: '切换新版结构化原生对话', exact: true })
      ).toHaveCount(0)
      await page.screenshot({
        path: path.join(evidence, `chat-settings-migration-${previousChatDefault}.png`)
      })
      expect(errors).toEqual([])
      expect(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows().some((window) => window.isVisible())
        )
      ).toBe(false)
    } finally {
      await closeElectronAppForE2E(app)
      await cleanupE2EDaemons(profile)
    }
    const saved = JSON.parse(readFileSync(profilePath, 'utf8'))
    expect(saved.settings.experimentalNativeChat).toBe(previousChatDefault)
    expect(saved.settings).not.toHaveProperty('openAgentTabsInChatByDefault')
    expect(saved.settings).not.toHaveProperty('experimentalStructuredNativeChat')
    writeFileSync(
      path.join(evidence, `chat-settings-migration-${previousChatDefault}.json`),
      JSON.stringify(
        {
          packageFingerprint,
          previousChatDefault,
          currentChatDefault: saved.settings.experimentalNativeChat,
          obsoleteFieldsRemoved: true
        },
        null,
        2
      )
    )
  })
}
