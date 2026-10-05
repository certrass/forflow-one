import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence } from './harness'
import { createPrivateProject, privateProfile } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('restored checklist keeps eight interactive steps, progress and local offline skill installation', async () => {
  const profile = privateProfile('checklist')
  const { app, page, errors } = await launch(profile)
  try {
    await page.getByRole('button', { name: '设置', exact: true }).click()
    writeFileSync(
      path.join(evidence, 'settings-checklist-dom.txt'),
      await page.locator('body').innerText()
    )
    await page.getByRole('button', { name: /^入门清单，/ }).click()
    const rows = page.locator('[data-setup-step-id]')
    await expect(rows).toHaveCount(8)
    for (const id of ['add-two-repos', 'agent-capabilities', 'browser']) {
      await expect(page.locator(`[data-setup-step-id="${id}"]`)).toHaveAttribute(
        'data-setup-step-complete',
        'false'
      )
    }
    const ids = [
      'notifications',
      'default-agent',
      'agent-capabilities',
      'task-sources',
      'setup-script',
      'add-two-repos',
      'two-worktrees',
      'browser'
    ]
    const labels: Record<string, string> = {}
    for (const id of ids) {
      const row = page.locator(`[data-setup-step-id="${id}"]`)
      await row.click()
      await expect(row).toHaveAttribute('aria-current', 'step')
      labels[id] = await row.innerText()
      expect(labels[id]).toMatch(/\p{Script=Han}/u)
    }
    await expect(page.locator('[data-testid="forflow-setup-guide"] section')).toHaveCount(6)
    const firstTaskGuide = page.locator('[data-testid="forflow-setup-guide"]')
    await expect(firstTaskGuide).toContainText('2. 准备 Codex')
    await expect(firstTaskGuide).toContainText('先完成一个小任务')
    await expect(firstTaskGuide).not.toContainText('安装并认证国内智能体')
    await firstTaskGuide.scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(evidence, 'first-task-setup-guide.png') })
    const content = await page
      .locator('#settings-section-setup-guide, #setup-guide')
      .allTextContents()
    await page.locator('[data-setup-step-id="agent-capabilities"]').click()
    await page.screenshot({ path: path.join(evidence, 'restored-eight-item-checklist.png') })
    const initialProgress = await rows.evaluateAll((elements) =>
      Object.fromEntries(
        elements.map((element) => [
          element.getAttribute('data-setup-step-id'),
          element.getAttribute('data-setup-step-complete') === 'true'
        ])
      )
    )
    // Exercise the actual offline IPC under the isolated test HOME; no real user's skill changes.
    const installed = await page.evaluate(() =>
      window.api.forflowSkills!.installBundled(['orca-cli', 'orchestration'])
    )
    expect(installed.every((entry) => entry.status === 'installed')).toBe(true)
    for (const entry of installed) {
      expect(entry.path).toContain(profile)
      expect(readFileSync(path.join(entry.path!, 'SKILL.md'), 'utf8')).toContain(
        'Forflow One 内置技能'
      )
    }
    // Use two real Git repositories to check that completion changes and survives reload.
    for (const name of ['项目一', '项目二']) {
      const repo = createPrivateProject(profile, name)
      const added = await page.evaluate(
        (repoPath) => window.api.repos.add({ path: repoPath }),
        repo
      )
      expect(added).not.toHaveProperty('error')
    }
    await page.reload()
    await page.getByRole('button', { name: /^入门清单，/ }).click()
    await expect(page.locator('[data-setup-step-id]')).toHaveCount(8)
    await expect(page.locator('[data-setup-step-id="add-two-repos"]')).toHaveAttribute(
      'data-setup-step-complete',
      'true'
    )
    await expect(page.locator('[data-setup-step-id="browser"]')).toHaveAttribute(
      'data-setup-step-complete',
      'false'
    )
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'checklist-result.json'),
      JSON.stringify(
        { labels, content, initialProgress, twoRepoCompletionAfterReload: true, installed, errors },
        null,
        2
      )
    )
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((win) => win.isVisible())
      )
    ).toBe(false)
  } finally {
    writeFileSync(
      path.join(evidence, 'checklist.spec.ts-final-dom.txt'),
      await page
        .locator('body')
        .innerText()
        .catch(() => 'renderer closed')
    )
    writeFileSync(path.join(evidence, 'checklist.spec.ts-errors.json'), JSON.stringify(errors))
    await page
      .screenshot({ path: path.join(evidence, 'checklist.spec.ts-final.png') })
      .catch(() => undefined)
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
