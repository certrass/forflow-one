import {
  selectReviewFiles,
  captureReviewIntake,
  captureReviewGuide,
  enterReviewGoal
} from './workspace-review-intake-qa'
import { test, expect, type Page } from '@stablyai/playwright-test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

const credential = 'sk-OnlySyntheticWorkspaceQaCredential0123456789'
const remoteName = 'Remote review fixture'

function seedRemoteTarget(profile: string): void {
  const file = path.join(profile, 'orca-data.json')
  const state = JSON.parse(readFileSync(file, 'utf8'))
  const now = Date.now()
  state.projectGroups = [
    {
      id: 'review-remote-group',
      name: remoteName,
      parentPath: '/remote/qa',
      connectionId: 'review-ssh',
      executionHostId: 'ssh:review-ssh',
      parentGroupId: null,
      createdFrom: 'manual',
      tabOrder: 0,
      isCollapsed: true,
      color: null,
      createdAt: now,
      updatedAt: now
    }
  ]
  state.folderWorkspaces = [
    {
      id: 'review-remote-folder',
      projectGroupId: 'review-remote-group',
      name: remoteName,
      folderPath: '/remote/qa',
      connectionId: 'review-ssh',
      executionHostId: 'ssh:review-ssh',
      linkedTask: null,
      comment: '',
      isArchived: false,
      isUnread: false,
      isPinned: false,
      sortOrder: 0,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now
    }
  ]
  writeFileSync(file, JSON.stringify(state))
}

async function chooseTarget(page: Page, name: string): Promise<void> {
  await page
    .getByTestId('workspace-review-intake')
    .getByRole('combobox', { name: '项目', exact: true })
    .click()
  await page.getByPlaceholder('搜索项目').fill(name)
  await page.getByRole('option').filter({ hasText: name }).click()
}

async function showWorkspaceReviews(page: Page, initial = false): Promise<void> {
  if (initial) {
    await page.getByRole('button', { name: '设置', exact: true }).click()
  }
  await page.getByRole('button', { name: '统计和使用情况', exact: true }).click()
  if (initial) {
    await page.getByTestId('usage-provider-select').click()
    await page.getByRole('menuitem', { name: 'Codex', exact: true }).click()
  }
  await page.getByRole('tab', { name: '审阅', exact: true }).click()
  await page.getByRole('tab', { name: '项目', exact: true }).click()
}

test('workspace review package: registered targets, local evidence, sensitive disposition, versions and restart', async () => {
  const profile = privateProfile('workspace-review')
  seedRemoteTarget(profile)
  let running = await launch(profile)
  try {
    const { app, page, errors } = running
    await app.evaluate(({ BrowserWindow, session }) => {
      BrowserWindow.getAllWindows()[0].setSize(1500, 1100)
      process.env.FORFLOW_QA_WORKSPACE_JEV_REQUESTS = '0'
      session.defaultSession.webRequest.onBeforeRequest(
        { urls: ['https://api.typesafe.ai/*'] },
        (_details, callback) => {
          process.env.FORFLOW_QA_WORKSPACE_JEV_REQUESTS = String(
            Number(process.env.FORFLOW_QA_WORKSPACE_JEV_REQUESTS) + 1
          )
          callback({})
        }
      )
    })
    await addPrivateProject(page, profile)
    const repo = path.join(profile, '测试项目')
    mkdirSync(path.join(repo, 'docs'))
    const source = path.join(repo, 'code.ts')
    writeFileSync(source, `export const apiKey = '${credential}'\nexport const result = 1\n`)
    writeFileSync(
      path.join(repo, 'docs/requirements.md'),
      'Keep behavior. Remove the credential.\n'
    )
    writeFileSync(
      path.join(repo, 'checks.txt'),
      'Synthetic receipt: 3 passed; version unverified.\n'
    )
    const folderPath = path.join(profile, 'plain-review-folder')
    mkdirSync(folderPath)
    writeFileSync(path.join(folderPath, 'notes.md'), '# Plain folder evidence\n')
    await page.evaluate(async (root) => {
      const group = await window.api.projectGroups.create({
        name: 'Folder review fixture',
        parentPath: root
      })
      await window.api.folderWorkspaces.create({
        projectGroupId: group.id,
        name: 'Folder review fixture',
        folderPath: root
      })
    }, folderPath)
    const targets = await page.evaluate(() => window.api.codexUsage.listWorkspaceReviewTargets!())
    const gitTarget = targets.find(
      (target) => target.rootPath === repo && target.kind === 'worktree'
    )
    const folderTarget = targets.find((target) => target.rootPath === folderPath)
    expect(gitTarget?.available).toBe(true)
    expect(folderTarget).toMatchObject({ available: true, kind: 'folder', hostId: 'local' })
    expect(targets.find((target) => target.name === remoteName)).toMatchObject({
      available: false,
      hostId: 'ssh:review-ssh'
    })
    await showWorkspaceReviews(page, true)
    await captureReviewGuide(page, 1, false)
    await chooseTarget(page, remoteName)
    const intake = page.getByTestId('workspace-review-intake')
    await expect(intake).toContainText('远端内容尚未读取')
    await expect(
      intake.getByRole('button', { name: '继续：确定检查目标', exact: true })
    ).toBeDisabled()
    await chooseTarget(page, repo)
    await captureReviewGuide(page, 1)
    await intake.getByRole('button', { name: '继续：确定检查目标', exact: true }).click()
    await captureReviewGuide(page, 2, false)
    await intake.getByRole('button', { name: '验证问题修复', exact: true }).click()
    await intake
      .getByRole('textbox', { name: '检查目标', exact: true })
      .fill('保留原功能，核对选定代码与验收材料；检查敏感线索及其处置依据。')
    await intake.getByRole('button', { name: '继续：补充验收条件', exact: true }).click()
    await expect(
      intake.getByRole('button', { name: '使用这项要求，继续选材料', exact: true })
    ).toBeDisabled()
    await intake
      .getByRole('textbox', { name: '预期结果', exact: true })
      .fill('原功能测试通过，敏感线索有逐项处置记录。')
    await expect(intake.getByTestId('review-goal-clarification')).toContainText('将保存的检查要求')
    await expect(intake.getByTestId('review-goal-clarification')).toBeVisible()
    await page.screenshot({
      path: path.join(evidence, 'intake-clarified-requirement.png'),
      animations: 'disabled'
    })
    await intake.getByRole('button', { name: '使用这项要求，继续选材料', exact: true }).click()
    await expect(intake.getByTestId('review-evidence-needs')).toContainText(
      '先选择相关交付物或需求'
    )
    await selectReviewFiles(intake, [
      { path: 'code.ts' },
      { path: 'docs/requirements.md' },
      { path: 'checks.txt', verification: true }
    ])
    await expect(intake.getByTestId('review-evidence-needs')).toContainText(
      '文件用途标签不代表测试已通过'
    )
    await captureReviewIntake(app, page)
    await intake.getByRole('button', { name: '进入审阅', exact: true }).click()
    const review = page.getByTestId('codex-review')
    await expect(review.getByTestId('workspace-review-summary')).toContainText('流向：未知')
    await expect(review.getByRole('button', { name: '确认此版本', exact: true })).toBeDisabled()
    const initial = (await page.evaluate(() => window.api.codexUsage.listWorkspaceReviews!()))[0]
    expect(initial.sessionId).toBeNull()
    expect(initial.versions[0].usage).toBeNull()
    expect(initial.versions[0].workspace?.selection.files).toEqual([
      { path: 'code.ts', kind: 'code' },
      { path: 'docs/requirements.md', kind: 'document' },
      { path: 'checks.txt', kind: 'verification' }
    ])
    expect(initial.versions[0].workspace?.git.status).toBe('ready')
    expect(initial.issues).toHaveLength(1)
    expect(JSON.stringify(initial)).not.toContain(credential)
    const guidance = page.getByRole('dialog', { name: '先核对审阅材料', exact: true })
    await expect(guidance).toBeVisible()
    await guidance.getByRole('button', { name: '查看原始记录', exact: true }).click()
    const sourceGuide = page.getByRole('dialog', { name: '查看原文，再标记缺口', exact: true })
    await expect(sourceGuide).toContainText('本机查看来源')
    await page.screenshot({
      path: path.join(evidence, 'project-review-read-source-guide.png'),
      animations: 'disabled'
    })
    await sourceGuide.getByRole('button', { name: '收起引导', exact: true }).click()
    const files = review.getByTestId('workspace-review-records')
    const code = files.locator('li').filter({ has: page.getByText('code.ts', { exact: true }) })
    await code.getByRole('button', { name: '本机查看来源', exact: true }).click()
    await expect(files.locator('pre')).toContainText('redacted')
    await expect(files.locator('pre')).not.toContainText(credential)
    await code.getByRole('button', { name: '审阅这条记录', exact: true }).click()
    const panel = review.getByTestId('jev-audit-panel')
    await panel.getByRole('button', { name: '准备发送预览', exact: true }).click()
    await expect(panel.getByTestId('jev-request-preview')).toContainText('export const result = 1')
    await expect(panel.getByTestId('jev-request-preview')).not.toContainText(credential)
    await expect(panel).toContainText('此来源存在覆盖缺口')
    await expect(page.getByRole('button', { name: '收起引导', exact: true })).toHaveCount(0)
    expect(await app.evaluate(() => process.env.FORFLOW_QA_WORKSPACE_JEV_REQUESTS)).toBe('0')
    expect(await page.evaluate((id) => window.api.forflowJevAudit!.list(id), initial.id)).toEqual(
      []
    )
    await page.screenshot({
      path: path.join(evidence, 'workspace-review-jev-preview.png'),
      animations: 'disabled'
    })
    writeFileSync(source, 'export const result = 2\n')
    await review.getByRole('tab', { name: '记录', exact: true }).click()
    await code.getByRole('button', { name: '本机查看来源', exact: true }).click()
    await expect(files.getByRole('alert')).toContainText('原始文件已变化')
    await review.getByRole('button', { name: '重新读取当前记录', exact: true }).click()
    await expect(review.getByRole('combobox', { name: '版本', exact: true })).toContainText('v2')
    await review.getByRole('tab', { name: '版本变化', exact: true }).click()
    await expect(review.getByTestId('workspace-review-changes')).toContainText('变化记录 · 1')
    await expect(review.getByTestId('workspace-review-changes')).toContainText('code.ts')
    const changed = await page.evaluate((id) => window.api.codexUsage.getReview!(id), initial.id)
    expect(changed.versions).toHaveLength(2)
    expect(changed.versions[0].workspace?.files[0].contentHash).not.toBe(
      changed.versions[1].workspace?.files[0].contentHash
    )
    expect(changed.issues[0].status).toBe('open')
    await review.getByRole('tab', { name: /发现的问题/ }).click()
    await review.getByRole('button', { name: '复查后解决', exact: true }).click()
    await review
      .getByRole('textbox', { name: '填写复查依据或例外说明' })
      .fill('已在 v2 移除合成凭据并核对新来源；此前外发和授权未作推断。')
    await review.getByRole('button', { name: '保存处理', exact: true }).click()
    await review.getByRole('tab', { name: '概览与活动', exact: true }).click()
    await review
      .getByRole('textbox', { name: '补充背景、讨论或解释例外' })
      .fill('仅验收明确选择的三个文件，测试回执尚待版本关联。')
    await review.getByRole('button', { name: '保存评论', exact: true }).click()
    await expect(review).toContainText('仅验收明确选择的三个文件，测试回执尚待版本关联。')
    await review.getByRole('button', { name: '返回项目审阅', exact: true }).click()
    await chooseTarget(page, 'Folder review fixture')
    await enterReviewGoal(intake, '审阅普通文件夹中的指定说明。')
    await selectReviewFiles(intake, [{ path: 'notes.md' }])
    await intake.getByRole('button', { name: '进入审阅', exact: true }).click()
    await expect(review).toContainText('Folder review fixture')
    const all = await page.evaluate(() => window.api.codexUsage.listWorkspaceReviews!())
    expect(all).toHaveLength(2)
    const folder = all.find((item) => item.versions[0].workspace?.target.id === folderTarget?.id)
    expect(folder?.sessionId).toBeNull()
    expect(folder?.versions[0].usage).toBeNull()
    expect(folder?.versions[0].workspace?.git.status).toBe('not_applicable')
    expect(folder?.versions[0].workspace?.files[0].status).toBe('read')
    expect(await app.evaluate(() => process.env.FORFLOW_QA_WORKSPACE_JEV_REQUESTS)).toBe('0')
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().every((window) => !window.isVisible())
      )
    ).toBe(true)
    await closeElectronAppForE2E(app)
    running = await launch(profile)
    await showWorkspaceReviews(running.page)
    await running.page
      .getByTestId('workspace-review-intake')
      .locator('div')
      .filter({ has: running.page.getByText(gitTarget?.name ?? '测试项目', { exact: true }) })
      .filter({ has: running.page.getByRole('button', { name: '打开审阅', exact: true }) })
      .last()
      .getByRole('button', { name: '打开审阅', exact: true })
      .click()
    const resumed = running.page.getByTestId('codex-review')
    await expect(resumed.getByRole('combobox', { name: '版本', exact: true })).toContainText('v2')
    await expect(resumed).toContainText('仅验收明确选择的三个文件，测试回执尚待版本关联。')
    await resumed.getByRole('tab', { name: /发现的问题/ }).click()
    await expect(resumed).toContainText('复查后解决')
    await expect(resumed).toContainText('已在 v2 移除合成凭据')
    const persisted = await running.page.evaluate(
      (id) => window.api.codexUsage.getReview!(id),
      initial.id
    )
    expect(persisted.issues[0].resolvedInVersion).toBe(persisted.versions[1].id)
    expect(persisted.confirmations).toHaveLength(0)
    await resumed.getByRole('combobox', { name: '版本', exact: true }).click()
    await running.page.getByRole('option', { name: /^v1/ }).click()
    await expect(
      resumed.getByRole('button', { name: '重新读取当前记录', exact: true })
    ).toBeDisabled()
    await running.app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setSize(1000, 850)
    )
    expect(await resumed.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true
    )
    await running.page.screenshot({
      path: path.join(evidence, 'workspace-review-restart.png'),
      animations: 'disabled'
    })
    expect(running.errors).toEqual([])
    expect(
      await running.app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().every((window) => !window.isVisible())
      )
    ).toBe(true)
    writeFileSync(
      path.join(evidence, 'workspace-review-proof.json'),
      JSON.stringify(
        {
          packageFingerprint,
          profile,
          folderTarget: folderTarget?.id,
          reviews: all.length,
          versions: persisted.versions.length,
          sessionId: persisted.sessionId,
          usage: persisted.versions[1].usage,
          sensitiveIssueResolvedInVersion: persisted.issues[0].resolvedInVersion,
          jevRequests: 0,
          restartReadback: true
        },
        null,
        2
      )
    )
  } catch (error) {
    await running.page.screenshot({ path: path.join(evidence, 'workspace-review-failure.png') })
    writeFileSync(
      path.join(evidence, 'workspace-review-failure.txt'),
      await running.page.locator('body').innerText()
    )
    throw error
  } finally {
    await closeElectronAppForE2E(running.app)
    cleanupE2EDaemons(profile)
  }
})
