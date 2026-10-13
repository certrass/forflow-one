import { test, expect } from '@stablyai/playwright-test'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createStructuredCodexFixture } from './structured-codex-fixture'
import { structuredAgentSessionCreateParams } from '../../src/shared/structured-agent-session-create'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('structured chat: Chat UI, host journal, child agent, find and stop in the packaged app', async () => {
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
    await page.getByText('Codex Chat', { exact: true }).click()
    const chat = page.locator('[data-native-chat-root="true"]:visible')
    const composer = chat.locator('[contenteditable="true"]').first()
    await expect(composer).toBeVisible()
    await composer.fill('请审阅这份材料并检查来源')
    await chat.getByRole('button', { name: '发送', exact: true }).click()
    await expect.poll(ledger).toContain('turn/start')
    await expect(chat).toContainText('已读取审阅材料，正在检查来源。')
    await expect(chat).toContainText('已启动 1 个子智能体')
    await expect(page.locator(`[role="option"][data-worktree-id="${workspaceId}"]`)).toContainText(
      'review'
    )
    const notice = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: 'Codex 现在使用独立服务运行' })
    await notice.getByRole('button', { name: 'Close toast', exact: true }).click()
    await expect(notice).toHaveCount(0)
    await page.screenshot({ path: path.join(evidence, 'structured-chat-child.png') })
    await chat.getByRole('button', { name: '停止智能体', exact: true }).click()
    await expect.poll(ledger).toContain('turn/interrupt')
    await expect(chat).toHaveAttribute('data-native-chat-working', 'false')
    await page.screenshot({ path: path.join(evidence, 'structured-chat-stopped.png') })
    await composer.click()
    await composer.press('ControlOrMeta+f')
    const findBar = chat.locator('[data-native-chat-find-bar="true"]')
    await expect(findBar).toBeVisible()
    await findBar.getByRole('textbox').fill('来源')
    await expect(findBar).toContainText(/\d+\/[1-9]\d*/)
    await page.screenshot({ path: path.join(evidence, 'structured-chat-find.png') })
    await findBar.getByRole('textbox').press('Escape')
    await expect(findBar).toHaveCount(0)
    await chat
      .getByText('已读取审阅材料，正在检查来源。', { exact: true })
      .first()
      .evaluate((element) => {
        element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
        const range = document.createRange()
        range.selectNodeContents(element)
        const selection = window.getSelection()
        if (!selection) {
          throw new Error('Selection unavailable')
        }
        selection.removeAllRanges()
        selection.addRange(range)
        document.dispatchEvent(new Event('selectionchange'))
        const rect = range.getBoundingClientRect()
        element.dispatchEvent(
          new MouseEvent('mouseup', {
            bubbles: true,
            button: 0,
            clientX: rect.right,
            clientY: rect.top
          })
        )
      })
    await page.getByRole('button', { name: '添加到聊天', exact: true }).dispatchEvent('click')
    await expect(composer).toContainText('> 已读取审阅材料，正在检查来源。')
    await page.screenshot({ path: path.join(evidence, 'structured-chat-quote.png') })
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
