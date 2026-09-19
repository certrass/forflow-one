import { expect, type Page } from '@stablyai/playwright-test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'
import { getE2ECompletedOnboardingProfile } from '../e2e/helpers/e2e-completed-onboarding-profile'
import { launch, evidence, packageFingerprint } from './harness'
import releaseProfile from '../../resources/forflow/release-profile.json'

export async function readCliStatusForSmoke(page: Page) {
  const result = await page.evaluate(async () => {
    try {
      return { kind: 'status' as const, status: await window.api.cli.getInstallStatus() }
    } catch (error) {
      return {
        kind: 'error' as const,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  })
  if (result.kind === 'status') {
    expect(result.status.commandName).toBe('forflow')
    expect(result.status.commandPath).toMatch(/\/forflow$/)
    expect(result.status.launcherPath).toMatch(
      /Forflow One\.app\/Contents\/Resources\/bin\/forflow$/
    )
  } else {
    expect(result.message).toMatch(
      /\b(?:EACCES|EPERM):[^\n]*\breadlink '\/usr\/local\/bin\/forflow'/
    )
  }
  return result
}

export async function verifyCliSettingsRecovery(): Promise<void> {
  const profile = realpathSync(mkdtempSync(path.join(tmpdir(), 'forflow-cli-smoke-')))
  const seed = getE2ECompletedOnboardingProfile()
  writeFileSync(
    path.join(profile, 'orca-data.json'),
    JSON.stringify({
      ...seed,
      settings: {
        ...seed.settings,
        uiLanguage: 'zh',
        workspaceDir: path.join(profile, 'workspaces')
      }
    })
  )
  const { app, page, errors } = await launch(profile)
  try {
    const resourcesPath = await app.evaluate(() => process.resourcesPath)
    const launcherPath = path.join(resourcesPath, 'bin', 'forflow')
    expect(launcherPath).toMatch(/Forflow One\.app\/Contents\/Resources\/bin\/forflow$/)
    const launcherVersion = execFileSync(launcherPath, ['--version'], {
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, HOME: profile, ORCA_BACKGROUND_LAUNCH: '1' }
    }).trim()
    expect(launcherVersion).toBe(releaseProfile.version)
    const cli = await readCliStatusForSmoke(page)
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '通用', exact: true }).click()
    const section = page.locator('[data-settings-section="cli"]')
    await expect(section).toBeVisible()
    const refresh = section.getByRole('button', { name: '刷新 CLI 状态', exact: true })
    await expect(refresh).toBeEnabled()
    if (cli.kind === 'error') {
      const alert = section.getByRole('alert')
      const permissionMessage =
        '没有权限读取命令路径，暂时无法确认注册状态。请检查该路径的访问权限后刷新。'
      await expect(alert).toHaveText(permissionMessage)
      await expect(section.getByRole('switch', { name: 'Shell 命令', exact: true })).toBeDisabled()
      await expect(
        section.getByRole('switch', { name: 'Shell 命令', exact: true })
      ).not.toBeChecked()
      await refresh.click()
      await expect(refresh).toBeEnabled()
      await expect(alert).toHaveText(permissionMessage)
      await expect(section).not.toContainText('正在读取命令注册状态')
      await expect(section).not.toContainText('invoking remote method')
      await expect(section.getByRole('switch', { name: 'Shell 命令', exact: true })).toBeDisabled()
    } else {
      await expect(section.getByRole('alert')).toHaveCount(0)
    }
    expect(errors).toEqual([])
    await page.screenshot({ path: path.join(evidence, 'smoke-cli-settings.png') })
    writeFileSync(
      path.join(evidence, 'smoke-cli-settings.json'),
      JSON.stringify(
        {
          cli,
          launcherPath,
          launcherVersion,
          errors,
          packageFingerprint,
          renderedText: await section.innerText(),
          verifiedAt: new Date().toISOString()
        },
        null,
        2
      )
    )
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
}
