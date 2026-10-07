import { test, expect } from '@stablyai/playwright-test'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('domestic connection discovery and real CLI status remain separate from history filters', async () => {
  test.setTimeout(180_000)
  const profile = privateProfile('domestic-connections')
  const { app, page, errors } = await launch(profile)
  try {
    await addPrivateProject(page, profile)
    await page.getByRole('button', { name: '智能体', exact: true }).click()
    await page.getByRole('button', { name: '会话历史查看选项', exact: true }).click()
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: /豆包／火山方舟/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /WorkBuddy／CodeBuddy/ })).toContainText(
      'CodeBuddy CLI 历史与恢复'
    )
    await expect(menu.getByRole('menuitem', { name: /QoderWork／Qoder CN/ })).toBeVisible()
    await expect(menu.getByRole('menuitemcheckbox', { name: /Kimi/ })).toBeVisible()
    await page.screenshot({ path: path.join(evidence, 'domestic-history-menu.png') })
    await menu.getByRole('menuitem', { name: /WorkBuddy／CodeBuddy/ }).click()
    const panel = page.getByTestId('forflow-domestic-connections')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('豆包／火山方舟')
    await expect(panel).toContainText('安装桌面版不代表已安装独立 CLI')
    await expect(panel).toContainText('模型连通性')
    await expect(
      panel.getByRole('link', { name: 'WorkBuddy／CodeBuddy 接入指南' })
    ).toHaveAttribute('href', 'https://www.codebuddy.cn/docs/cli/installation')
    await expect(panel.getByRole('link', { name: 'QoderWork／Qoder CN 接入指南' })).toHaveAttribute(
      'href',
      'https://docs.qoder.cn/cli/quickstart'
    )
    await page.screenshot({ path: path.join(evidence, 'domestic-settings.png') })
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'domestic-connections.json'),
      JSON.stringify(
        { packageFingerprint, menuNavigation: true, settingsText: await panel.innerText(), errors },
        null,
        2
      )
    )
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
