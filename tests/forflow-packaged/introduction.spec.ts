import { test, expect } from '@stablyai/playwright-test'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('product introduction renders the workflow tour in the installed application', async () => {
  const profile = privateProfile('introduction')
  const { app, page, errors } = await launch(profile)
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: '帮助', exact: true }).click()
    await page.getByRole('menuitem', { name: '产品介绍', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const sections = [
      ['workspaces', []],
      ['tasks', []],
      ['agents-orchestration', ['运行状态', '任务编排', '用量']],
      ['workbench', ['终端', '编辑器', '浏览器']],
      ['review', ['审阅意见', '合并请求检查', '提交准备']]
    ] as const
    const pages: Record<string, string> = {}
    for (const [id, steps] of sections) {
      await dialog.locator(`[data-feature-wall-workflow-id="${id}"]`).click()
      for (const step of steps.length ? steps : ['']) {
        if (step) {
          await dialog.getByRole('button', { name: new RegExp(`${step}$`) }).click()
        }
        const text = await dialog.innerText()
        pages[`${id}-${step}`] = text
        await expect(dialog.locator('h3').first()).toContainText(/\p{Script=Han}/u)
        expect(text).not.toMatch(
          /\bOrca\b|\bWorkspaces\b|Code Review|Reopen any time|Resets in|% used|pnpm 迁移/
        )
        const lastPage = id === 'review' && step === '提交准备'
        await expect(
          dialog.getByRole('button', {
            name: new RegExp(lastPage ? '^已完成(?:\\s+[⌘⌃]|$)' : '^继续(?:\\s+[⌘⌃]|$)')
          })
        ).toBeVisible()
        await page.screenshot({
          path: path.join(evidence, `introduction-${id}-${step || 'main'}.png`)
        })
      }
    }
    writeFileSync(
      path.join(evidence, 'introduction-pages.json'),
      JSON.stringify({ packageFingerprint, pages }, null, 2)
    )
    expect(errors).toEqual([])
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
