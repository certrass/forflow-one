import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createChatProviderFixture } from './chat-provider-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('collaboration reuses session continuation and fork with source context', async () => {
  const profile = privateProfile('existing-collaboration')
  const fixture = createChatProviderFixture(profile, 'claude', {
    independentSessions: true,
    seedConversation: false
  })
  const profileFile = path.join(profile, 'orca-data.json')
  const seed = JSON.parse(readFileSync(profileFile, 'utf8'))
  Object.assign(seed.settings, {
    defaultTuiAgent: 'claude',
    agentCmdOverrides: { claude: fixture.command.trim() },
    experimentalNativeChat: true,
    experimentalStructuredNativeChat: false,
    openAgentTabsInChatByDefault: true
  })
  writeFileSync(profileFile, JSON.stringify(seed))
  const { app, page, errors } = await launch(profile)
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1250, 900))
    await addPrivateProject(page, profile)
    const toolbar = page.locator('[data-forflow-session-toolbar]:visible').first()
    const entry = toolbar.getByRole('button', { name: '智能体协作', exact: true })
    const composer = page
      .locator('.native-chat-pane-shell:visible [contenteditable="true"]')
      .first()
    await expect(composer).toBeEditable()
    await expect
      .poll(() =>
        readFileSync(fixture.ledger, 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line))
          .some((event) => event.type === 'start' && event.tabId !== String(event.pid))
      )
      .toBe(true)
    await composer.fill('工作台测试任务')
    await composer.press('Enter')
    await expect(page.getByText('工作台测试任务', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('收到：工作台测试任务', { exact: true })).toBeVisible()
    const sourceTranscript = readFileSync(fixture.ledger, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
      .findLast((event) => event.type === 'start')?.transcript
    expect(typeof sourceTranscript).toBe('string')
    await composer.fill('保留当前草稿')
    await entry.click()
    await expect(page.getByRole('menuitem', { name: '在新会话中继续…' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: '派生智能体会话...' })).toBeVisible()
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, 'collaboration-actions.png')
    })
    await page.getByRole('menuitem', { name: '在新会话中继续…' }).click()
    const continuation = page.getByRole('dialog', { name: '在新会话中继续', exact: true })
    await expect(continuation).toBeVisible()
    await expect(continuation).toContainText('测试项目')
    await expect(
      continuation.getByRole('button', { name: '启动新会话', exact: true })
    ).toBeEnabled()
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, 'collaboration-continuation.png')
    })
    await continuation.getByRole('button', { name: '启动新会话', exact: true }).click()
    await expect(continuation).toHaveCount(0)
    await expect(composer).toContainText(sourceTranscript)
    await expect(composer).toContainText('继续 Forflow One 中的上一项任务')
    await expect(page.getByText('上下文已放入新的 Claude 草稿，发送后即可继续。')).toBeVisible()
    await expect(composer).toContainText(path.join(profile, '测试项目'))
    await expect(composer).not.toContainText('[每个任务使用相同的目标]')
    expect(readFileSync(sourceTranscript, 'utf8')).toContain('工作台测试任务')
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, 'collaboration-context-draft.png')
    })
    const contextDraft = await composer.innerText()
    await entry.click()
    await page.getByRole('menuitem', { name: '派生智能体会话...' }).click()
    const fork = page.getByRole('dialog', { name: '派生智能体会话', exact: true })
    await expect(fork).toBeVisible()
    await expect(fork.getByRole('button', { name: '创建派生', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(fork).toHaveCount(0)
    await expect(composer).toHaveText(contextDraft, { useInnerText: true })
    await entry.click()
    await page.getByRole('menuitem', { name: '编排与使用方法', exact: true }).click()
    await page.getByText('移交活动任务', { exact: true }).click()
    const example = page.getByRole('dialog', { name: '移交活动任务', exact: true })
    await expect(example).toContainText('把当前任务移交')
    await expect(example).not.toContainText('billing settings')
    await example.getByRole('button', { name: '复制提示', exact: true }).click()
    const clipboard = await app.evaluate(({ clipboard }) => clipboard.readText())
    expect(clipboard).toContain('/orchestration')
    expect(clipboard).toContain('当前任务')
    await page.screenshot({
      animations: 'disabled',
      path: path.join(evidence, 'collaboration-orchestration-example.png')
    })
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((w) => w.isVisible())
      )
    ).toBe(false)
    writeFileSync(
      path.join(evidence, 'collaboration.json'),
      JSON.stringify(
        {
          packageFingerprint,
          errors,
          externalMessagesSent: false,
          checked: [
            'source session transcript',
            'source working directory',
            'editable continuation draft',
            'existing fork dialog',
            'draft preserved',
            'localized orchestration example'
          ]
        },
        null,
        2
      )
    )
  } catch (error) {
    await page.screenshot({ path: path.join(evidence, 'collaboration-failure.png') })
    writeFileSync(
      path.join(evidence, 'collaboration-failure.txt'),
      await page.locator('body').innerText()
    )
    throw error
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
