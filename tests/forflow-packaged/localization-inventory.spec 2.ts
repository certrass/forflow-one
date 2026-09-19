import { test, expect } from '@stablyai/playwright-test'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('Chinese desktop settings inventory', async () => {
  test.setTimeout(240_000)
  const profile = privateProfile('localization-inventory')
  const { app, page, errors } = await launch(profile)
  const pages: { title: string; text: string; attributes: string[] }[] = []
  try {
    await page.getByRole('button', { name: '设置', exact: true }).click()
    const sidebar = page.getByRole('button', { name: '返回应用', exact: true }).locator('../..')
    await expect(sidebar.getByRole('button', { name: '外观', exact: true })).toBeVisible()
    const titles = await sidebar.locator('button').allTextContents()
    writeFileSync(path.join(evidence, 'settings-sidebar.txt'), await sidebar.innerText())
    for (const [index, title] of titles.entries()) {
      if (!title.trim() || title.includes('返回应用')) {
        continue
      }
      const button = sidebar.locator('button').nth(index)
      await button.click()
      await expect(button).toHaveAttribute('aria-current', 'page')
      const text = await page.locator('body').innerText()
      const attributes = await page
        .locator('[placeholder], [title], [aria-label]')
        .evaluateAll((elements) =>
          elements
            .flatMap((element) =>
              ['placeholder', 'title', 'aria-label'].map((name) => element.getAttribute(name) ?? '')
            )
            .filter(Boolean)
        )
      expect([text, ...attributes].join('\n'), title).not.toMatch(
        /Turn on notifications|Choose your default agent|Enable Forflow One CLI|Connect integrations|Automate workspace setup|Start work in multiple repos|Multi-task|Use Forflow One.s browser|Toggle Agent Dashboard|New Terminal Tab|Open Settings|Auto-select device|Not scanned yet|Notifications alt\+T|Terminal input/
      )
      pages.push({ title, text, attributes })
      await page.screenshot({ path: path.join(evidence, `settings-${pages.length}.png`) })
    }
    expect(pages.length).toBeGreaterThan(15)
    expect(errors).toEqual([])
  } finally {
    writeFileSync(
      path.join(evidence, 'localization-inventory.json'),
      JSON.stringify({ packageFingerprint, pages, errors }, null, 2)
    )
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
