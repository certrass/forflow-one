import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Page } from '@stablyai/playwright-test'
import { getE2ECompletedOnboardingProfile } from '../e2e/helpers/e2e-completed-onboarding-profile'

export function privateProfile(label: string): string {
  const profile = realpathSync(mkdtempSync(path.join(tmpdir(), `forflow-${label}-`)))
  const seed = getE2ECompletedOnboardingProfile()
  writeFileSync(
    path.join(profile, 'orca-data.json'),
    JSON.stringify({
      ...seed,
      settings: {
        ...seed.settings,
        uiLanguage: 'zh',
        workspaceDir: path.join(profile, 'workspaces')
      },
      ui: {
        ...seed.ui,
        featureInteractions: {},
        setupGuideSidebarDismissed: false,
        // Model current profiles, not the pre-browser-milestone compatibility migration.
        setupGuideBrowserMilestoneMigrated: true,
        setupGuideBrowserMilestoneLegacyComplete: false
      }
    })
  )
  return profile
}

export function createPrivateProject(profile: string, name = '测试项目'): string {
  const repo = path.join(profile, name)
  mkdirSync(repo)
  writeFileSync(path.join(repo, 'README.md'), '# 权限与数据传输测试\n')
  for (const args of [
    ['init', '-b', 'main'],
    ['config', 'user.email', 'test@example.invalid'],
    ['config', 'user.name', 'Forflow QA'],
    ['add', '.'],
    ['commit', '-m', 'test fixture']
  ]) {
    execFileSync('git', args, { cwd: repo, stdio: 'pipe' })
  }
  return repo
}

export async function addPrivateProject(page: Page, profile: string): Promise<string> {
  const repo = createPrivateProject(profile)
  const result = await page.evaluate((path) => window.api.repos.add({ path }), repo)
  if ('error' in result) {
    throw new Error(result.error)
  }
  const worktrees = await page.evaluate(
    (repoId) => window.api.worktrees.list({ repoId }),
    result.repo.id
  )
  const primary = worktrees.find((worktree) => worktree.path === repo)
  if (!primary) {
    throw new Error('测试项目未产生主工作区')
  }
  await page.reload()
  await page.locator(`[role="option"][data-worktree-id="${primary.id}"]`).click()
  return primary.id
}
