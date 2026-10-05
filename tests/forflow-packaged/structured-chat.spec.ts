import { test, expect } from '@stablyai/playwright-test'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createStructuredCodexFixture } from './structured-codex-fixture'
import { structuredAgentSessionCreateParams } from '../../src/shared/structured-agent-session-create'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('structured chat: opt-in, host journal, child agent and stop in the packaged app', async () => {
  const profile = privateProfile('structured-chat')
  const fixture = createStructuredCodexFixture(profile)
  const { app, page, errors } = await launch(profile, {
    PATH: `${fixture.bin}${path.delimiter}${process.env.PATH ?? ''}`
  })
  app
    .process()
    .stderr?.on('data', (chunk) =>
      writeFileSync(path.join(evidence, 'structured-stderr.log'), chunk, { flag: 'a' })
    )
  const ledger = () => readFileSync(fixture.ledger, 'utf8')
  try {
    const workspaceId = await addPrivateProject(page, profile)
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '实验性', exact: true }).click()
    const chatToggle = page.getByRole('switch', { name: '切换 Chat UI', exact: true })
    if (!(await chatToggle.isChecked())) {
      await chatToggle.click()
    }
    await page.getByRole('combobox', { name: '默认 Chat UI 视图', exact: true }).click()
    await page.getByRole('option', { name: '聊天界面', exact: true }).click()
    const toggle = page.getByRole('switch', { name: '切换新版结构化原生对话', exact: true })
    await expect(toggle).not.toBeChecked()
    await toggle.click()
    await expect(toggle).toBeChecked()
    await page.keyboard.press('Escape')
    const sessionId = `codex_${randomUUID().replaceAll('-', '_')}`
    const params = structuredAgentSessionCreateParams({
      sessionId,
      worktree: `id:${workspaceId}`,
      agent: 'codex',
      randomUuid: randomUUID
    })
    const created = await page.evaluate(
      (params) => window.api.runtime.call({ method: 'agentSession.create', params }),
      params
    )
    writeFileSync(path.join(evidence, 'structured-create.json'), JSON.stringify(created, null, 2))
    expect(created).toMatchObject({ ok: true, result: { ok: true, value: { sessionId } } })
    await expect.poll(ledger).toContain('thread/start')
    await page.reload()
    await page.getByRole('tab').filter({ hasText: 'Codex' }).last().click()
    const chat = page.locator('[data-native-chat-root="true"]:visible')
    const composer = chat.locator('[contenteditable="true"]').first()
    await expect(composer).toBeVisible()
    await composer.fill('请审阅这份材料并检查来源')
    await chat.getByRole('button', { name: '发送', exact: true }).click()
    await expect.poll(ledger).toContain('turn/start')
    await expect(chat).toContainText('已读取审阅材料，正在检查来源。')
    await expect(chat).toContainText('review')
    await page.screenshot({ path: path.join(evidence, 'structured-chat-child.png') })
    await chat.getByRole('button', { name: '停止智能体', exact: true }).click()
    await expect.poll(ledger).toContain('turn/interrupt')
    await expect(chat).toHaveAttribute('data-native-chat-working', 'false')
    await page.screenshot({ path: path.join(evidence, 'structured-chat-stopped.png') })
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((window) => window.isVisible())
      )
    ).toBe(false)
    writeFileSync(
      path.join(evidence, 'structured-chat.json'),
      JSON.stringify(
        {
          packageFingerprint,
          sessionId,
          workspaceId,
          errors,
          provider: 'local app-server fixture; no model API',
          calls: ledger()
        },
        null,
        2
      )
    )
  } catch (error) {
    writeFileSync(
      path.join(evidence, 'structured-error.txt'),
      await page.locator('body').innerText()
    )
    await page.screenshot({ path: path.join(evidence, 'structured-error.png') })
    throw error
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
