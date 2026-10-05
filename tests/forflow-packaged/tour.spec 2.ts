import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('the actual parallel-task tour renders in Chinese after splitting a terminal', async () => {
  const profile = privateProfile('tour')
  const configPath = path.join(profile, 'orca-data.json')
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  config.ui.contextualToursAutoEligible = true
  writeFileSync(configPath, JSON.stringify(config))
  const { app, page, errors } = await launch(profile)
  try {
    await addPrivateProject(page, profile)
    await page.getByRole('button', { name: '拆分终端', exact: true }).click()
    await expect(page.getByText('并行开始另一项任务', { exact: true })).toBeVisible()
    await expect(
      page.getByText('每个工作树都有独立分支，让并行任务的改动分别保存。', { exact: true })
    ).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Start another task in parallel')
    await expect(page.locator('body')).not.toContainText('Each worktree gets its own branch')
    await page.screenshot({ path: path.join(evidence, 'parallel-task-tour-chinese.png') })
    expect(errors).toEqual([])
  } finally {
    writeFileSync(
      path.join(evidence, 'tour-dom.txt'),
      await page
        .locator('body')
        .innerText()
        .catch(() => 'closed')
    )
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
