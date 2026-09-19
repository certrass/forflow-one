import { test, expect, type ElectronApplication } from '@stablyai/playwright-test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'
import { getE2ECompletedOnboardingProfile } from '../e2e/helpers/e2e-completed-onboarding-profile'

import { launch, evidence, packageFingerprint } from './harness'
import { readCliStatusForSmoke, verifyCliSettingsRecovery } from './cli-status-smoke'
import releaseProfile from '../../resources/forflow/release-profile.json'

test('smoke: production app starts in Chinese with independent identity and private defaults', async () => {
  const profile = realpathSync(mkdtempSync(path.join(tmpdir(), 'forflow-smoke-')))
  const { app, page, errors } = await launch(profile)
  try {
    const identity = await app.evaluate(({ app, BrowserWindow }) => ({
      name: app.getName(),
      version: app.getVersion(),
      packaged: app.isPackaged,
      dataPath: app.getPath('userData'),
      visibleWindows: BrowserWindow.getAllWindows().filter((w) => w.isVisible()).length
    }))
    expect(identity).toMatchObject({
      name: 'Forflow One',
      version: releaseProfile.version,
      packaged: true,
      dataPath: profile,
      visibleWindows: 0
    })
    expect(await page.evaluate(() => Boolean(Reflect.get(window, '__store')))).toBe(false)
    const settings = await page.evaluate(() => window.api.settings.get())
    expect(settings.uiLanguage).toBe('zh')
    expect(settings.experimentalNativeChat).toBe(true)
    expect(settings.openAgentTabsInChatByDefault).toBe(true)
    expect(settings.experimentalStructuredNativeChat).toBe(false)
    expect(settings.workspaceDir).toContain('Forflow One')
    expect(settings.artifactSharingEnabled).toBe(false)
    expect(settings.agentSkillSharingEnabled).toBe(false)
    expect(settings.showMobileButton).toBe(false)
    await expect(page).toHaveTitle('Forflow One')
    await expect(page.getByRole('button', { name: /^继续/ })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('No workspaces found')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: /跳过权限检查/ })).not.toBeChecked()
    const more = page.getByRole('button', { name: /显示另外.*智能体/ })
    if (await more.isVisible()) {
      await more.click()
    }
    await expect(
      page.getByRole('button', { name: 'CodeBuddy codebuddy', exact: true })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Qoder CN qodercn', exact: true })).toBeVisible()
    await expect(page.locator('img[src*="google.com/s2/favicons"]')).toHaveCount(0)
    expect(
      await page
        .locator('img')
        .evaluateAll((images) =>
          images.some((i) => i instanceof HTMLImageElement && i.naturalWidth === 512 && i.complete)
        )
    ).toBe(true)
    const cli = await readCliStatusForSmoke(page)
    const nativePermissions = await page.evaluate(() =>
      window.api.computerUsePermissions.getStatus()
    )
    expect(nativePermissions.platform).toBe('darwin')
    expect(nativePermissions.helperUnavailableReason).toBeNull()
    expect(nativePermissions.helperAppPath).toContain('Forflow One 电脑操作.app')
    expect(nativePermissions.permissions.map((permission) => permission.id).sort()).toEqual([
      'accessibility',
      'screenshots'
    ])
    expect(errors).toEqual([])
    await page.screenshot({ path: path.join(evidence, 'smoke-first-launch.png') })
    writeFileSync(
      path.join(evidence, 'smoke-identity.json'),
      JSON.stringify(
        {
          identity,
          cli,
          nativePermissions,
          errors,
          packageFingerprint,
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
  await verifyCliSettingsRecovery()
})

test('regression: local project, worktree, Chinese terminal, file editing, diff and restart', async () => {
  const profile = realpathSync(mkdtempSync(path.join(tmpdir(), 'forflow-regression-')))
  const repo = path.join(profile, 'test-project')
  mkdirSync(repo)
  writeFileSync(path.join(repo, 'README.md'), '# Forflow One 本地测试\n\n用于验证中文文件编辑。\n')
  writeFileSync(path.join(repo, 'hello.txt'), 'before\n')
  for (const args of [
    ['init', '-b', 'main'],
    ['config', 'user.email', 'test@example.invalid'],
    ['config', 'user.name', 'Forflow QA'],
    ['add', '.'],
    ['commit', '-m', 'Initial test fixture']
  ]) {
    execFileSync('git', args, { cwd: repo, stdio: 'pipe' })
  }
  const seed = getE2ECompletedOnboardingProfile()
  writeFileSync(
    path.join(profile, 'orca-data.json'),
    JSON.stringify({
      ...seed,
      settings: {
        ...seed.settings,
        uiLanguage: 'zh',
        workspaceDir: path.join(profile, 'workspaces'),
        artifactSharingEnabled: false,
        agentSkillSharingEnabled: false,
        showMobileButton: false
      }
    })
  )
  let running: ElectronApplication | null = null
  try {
    const { app, page, errors } = await launch(profile)
    running = app
    const result = await page.evaluate((p) => window.api.repos.add({ path: p }), repo)
    if ('error' in result) {
      throw new Error(result.error)
    }
    const created = await page.evaluate(
      (repoId) =>
        window.api.worktrees.create({ repoId, name: 'forflow-regression', baseBranch: 'main' }),
      result.repo.id
    )
    if ('error' in created) {
      throw new Error(String(created.error))
    }
    expect(created.worktree.path).toContain(profile)
    await page.reload()
    const row = page.locator(`[role="option"][data-worktree-id="${created.worktree.id}"]`)
    await expect(row).toBeVisible()
    await row.click()
    await expect(row).toHaveAttribute('aria-current', 'page')

    await page.getByRole('button', { name: '帮助', exact: true }).click()
    await expect(page.getByRole('menu')).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Discord', exact: true })).toHaveCount(0)
    await expect(page.getByRole('menuitem', { name: 'X', exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape')

    const terminal = await page.evaluate(async (cwd) => {
      const events: string[] = []
      const dispose = window.api.pty.onData((event) => events.push(event.data))
      const pty = await window.api.pty.spawn({ cols: 80, rows: 24, cwd, shellOverride: '/bin/zsh' })
      window.api.pty.write(pty.id, "printf '\\u4e2d\\u6587-PTY-%s\\n' 'PASS'\r")
      const deadline = Date.now() + 20_000
      while (Date.now() < deadline && !events.join('').includes('中文-PTY-PASS')) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      await window.api.pty.kill(pty.id)
      dispose()
      return events.join('')
    }, created.worktree.path)
    expect(terminal).toContain('中文-PTY-PASS')

    await page.screenshot({ path: path.join(evidence, 'regression-workspace.png') })
    writeFileSync(path.join(evidence, 'regression-dom.txt'), await page.locator('body').innerText())
    // File editing and diff assertions continue below; use the actual rendered controls.
    await page
      .getByRole('button', { name: /资源管理器|文件浏览|Explorer/ })
      .first()
      .click()
    const explorer = page.locator('[data-orca-explorer-shell]')
    const readme = explorer.locator('[data-file-explorer-row]').filter({
      has: page.locator('[data-file-explorer-row-name]').getByText('README.md', { exact: true })
    })
    await expect(readme).toBeVisible()
    await readme.click()
    const editor = page.locator('.rich-markdown-editor')
    await expect(editor).toContainText('用于验证中文文件编辑。')
    await editor.click()
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.press('Enter')
    await page.keyboard.insertText('中文保存与重启回归通过。')
    await page.keyboard.press('ControlOrMeta+S')
    await expect
      .poll(() => readFileSync(path.join(created.worktree.path, 'README.md'), 'utf8'))
      .toContain('中文保存与重启回归通过。')
    await page.screenshot({ path: path.join(evidence, 'regression-chinese-edit.png') })
    await page
      .getByRole('button', { name: /源代码控制|Source Control/ })
      .first()
      .click()
    const changedFile = page
      .locator('[data-testid="source-control-entry"]')
      .filter({ hasText: 'README.md' })
    await expect(changedFile).toBeVisible()
    await changedFile.click()
    await expect(page.locator('.monaco-diff-editor')).toBeVisible()
    await expect(
      page
        .locator('.modified-in-monaco-diff-editor .view-line')
        .filter({ hasText: '中文保存与重启回归通过。' })
    ).toBeVisible()
    await page.screenshot({ path: path.join(evidence, 'regression-diff.png') })
    await page.locator('.modified-in-monaco-diff-editor textarea').focus()
    await page.keyboard.press('ControlOrMeta+F')
    const findInput = page.getByRole('textbox', { name: '查找', exact: true })
    writeFileSync(
      path.join(evidence, 'monaco-find-diagnostic.json'),
      JSON.stringify(
        await page.evaluate(() => ({
          text: document.body.innerText,
          inputs: [...document.querySelectorAll('input,textarea')].map((el) => ({
            label: el.getAttribute('aria-label'),
            placeholder: el.getAttribute('placeholder'),
            cls: el.className
          }))
        })),
        null,
        2
      )
    )
    await expect(findInput).toBeVisible()
    await expect(findInput).toHaveAttribute('placeholder', /查找/)
    await findInput.fill('中文保存')
    await expect(findInput).toHaveValue('中文保存')
    await page.screenshot({ path: path.join(evidence, 'regression-monaco-chinese.png') })
    await page.keyboard.press('Escape')
    const worktrees = await page.evaluate(
      (repoId) => window.api.worktrees.list({ repoId }),
      result.repo.id
    )
    const primary = worktrees.find((worktree) => worktree.path === repo)
    expect(primary).toBeDefined()
    await page.locator(`[role="option"][data-worktree-id="${primary!.id}"]`).click()
    expect(readFileSync(path.join(repo, 'README.md'), 'utf8')).not.toContain(
      '中文保存与重启回归通过。'
    )
    await row.click()
    await expect(row).toHaveAttribute('aria-current', 'page')
    expect(errors).toEqual([])
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '外观', exact: true }).click()
    await page.getByRole('radio', { name: '深色', exact: true }).first().click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.screenshot({ path: path.join(evidence, 'regression-dark.png') })
    await page.getByRole('button', { name: '返回应用', exact: true }).click()
    await closeElectronAppForE2E(app)
    running = null
    const relaunched = await launch(profile)
    running = relaunched.app
    await expect(
      relaunched.page.locator(`[role="option"][data-worktree-id="${created.worktree.id}"]`)
    ).toBeVisible()
    expect((await relaunched.page.evaluate(() => window.api.settings.get())).uiLanguage).toBe('zh')
    expect(readFileSync(path.join(created.worktree.path, 'README.md'), 'utf8')).toContain(
      '中文保存与重启回归通过。'
    )
    expect(relaunched.errors).toEqual([])
    expect((await relaunched.page.evaluate(() => window.api.settings.get())).theme).toBe('dark')
    await expect(relaunched.page.locator('html')).toHaveClass(/dark/)
    await expect(
      relaunched.page.locator(`[role="option"][data-worktree-id="${created.worktree.id}"]`)
    ).toHaveAttribute('aria-current', 'page')
    await relaunched.page.screenshot({ path: path.join(evidence, 'regression-restart.png') })
  } finally {
    if (running) {
      await closeElectronAppForE2E(running)
    }
    await cleanupE2EDaemons(profile)
  }
})
