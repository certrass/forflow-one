import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from './helpers/orca-app'

test.describe('Forflow One private first launch', () => {
  test.use({
    dismissOnboarding: false,
    seedTestRepo: false,
    orcaAppExtraEnv: { FORFLOW_DEPLOYMENT_PROFILE: 'cn-private', ORCA_BACKGROUND_LAUNCH: '1' }
  })

  test('starts in Chinese with independent workspaces and cloud controls disabled', async ({
    orcaPage,
    electronApp
  }) => {
    const state = await orcaPage.evaluate(() => {
      const settings = window.__store?.getState().settings
      if (!settings) {
        throw new Error('Settings not loaded')
      }
      return {
        language: settings.uiLanguage,
        workspaceDir: settings.workspaceDir,
        sharing: settings.artifactSharingEnabled,
        skills: settings.agentSkillSharingEnabled,
        mobile: settings.showMobileButton
      }
    })
    expect(state.language).toBe('zh')
    expect(state.workspaceDir).toContain('Forflow One')
    expect(state.sharing).toBe(false)
    expect(state.skills).toBe(false)
    expect(state.mobile).toBe(false)
    const identity = await electronApp.evaluate(({ app, BrowserWindow }) => ({
      name: app.getName(),
      dataPath: app.getPath('userData'),
      visibleWindows: BrowserWindow.getAllWindows().filter((window) => window.isVisible()).length
    }))
    expect(identity.name).toContain('Forflow One')
    expect(identity.dataPath).toContain('orca-e2e')
    expect(identity.visibleWindows).toBe(0)
    await expect(orcaPage.locator('body')).toContainText('智能体')
    await expect(orcaPage.getByRole('button', { name: /^继续/ })).toBeVisible()
    await expect(orcaPage.getByRole('checkbox', { name: /跳过权限检查/ })).not.toBeChecked()
    const moreAgents = orcaPage.getByRole('button', { name: /显示另外.*智能体/ })
    if (await moreAgents.isVisible()) {
      await moreAgents.click()
    }
    await expect(
      orcaPage.getByRole('button', { name: 'CodeBuddy codebuddy', exact: true })
    ).toBeVisible()
    await expect(
      orcaPage.getByRole('button', { name: 'Qoder CN qodercn', exact: true })
    ).toBeVisible()
    await expect(orcaPage.getByRole('heading', { name: 'ORCA', exact: true })).toHaveCount(0)
    await expect(
      orcaPage.getByRole('button', { name: 'Codex codex', exact: true })
    ).toHaveAttribute('aria-pressed', 'false')
    await expect(orcaPage.locator('img[src*="google.com/s2/favicons"]')).toHaveCount(0)
    const evidence = path.resolve('.forflow/evidence')
    mkdirSync(evidence, { recursive: true })
    await orcaPage.screenshot({ path: path.join(evidence, 'forflow-first-launch.png') })
    writeFileSync(
      path.join(evidence, 'startup.json'),
      JSON.stringify({ state, identity, verifiedAt: new Date().toISOString() }, null, 2)
    )
  })
})
