import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { createFeishuCliFixture } from './feishu-cli-fixture'
import { createChatProviderFixture } from './chat-provider-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('Feishu: connect, tasklist, paging, editable import and unsent Codex draft', async () => {
  const profile = privateProfile('feishu-tasks')
  const cli = createFeishuCliFixture(profile)
  const codex = createChatProviderFixture(profile, 'codex')
  const file = path.join(profile, 'orca-data.json')
  const data = JSON.parse(readFileSync(file, 'utf8'))
  Object.assign(data.settings, {
    defaultTuiAgent: 'codex',
    agentCmdOverrides: { codex: codex.command.trim() },
    experimentalNativeChat: true,
    experimentalStructuredNativeChat: false,
    openAgentTabsInChatByDefault: true
  })
  writeFileSync(file, JSON.stringify(data))
  const { app, page, errors } = await launch(profile, {
    PATH: `${cli.bin}${path.delimiter}${process.env.PATH}`
  })
  try {
    await addPrivateProject(page, profile)
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '集成', exact: true }).click()
    const connection = page.locator('[data-settings-section="forflow-feishu"]')
    await expect(connection).toContainText('首次连接与授权指引')
    await connection.scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(evidence, 'feishu-setup.png') })
    await connection.getByRole('button', { name: '连接本机飞书', exact: true }).click()
    await expect(connection).toContainText('已绑定 · 隔离测试用户')
    expect(readFileSync(cli.ledger, 'utf8')).not.toContain('"task"')
    await connection.getByRole('button', { name: '浏览任务', exact: true }).click()
    const tasks = page.getByTestId('feishu-tasks')
    await expect(tasks.getByRole('button', { name: '读取任务', exact: true })).toBeEnabled()
    await tasks.getByRole('button', { name: '读取任务清单', exact: true }).click()
    await tasks.getByRole('combobox', { name: '飞书任务清单' }).click()
    await page.getByRole('option', { name: '研发任务清单', exact: true }).click()
    await tasks.getByRole('button', { name: '读取任务', exact: true }).click()
    await expect(tasks).toContainText('修复任务登录流程')
    await tasks.getByRole('button', { name: '加载更多任务', exact: true }).click()
    await expect(tasks).toContainText('第二页任务')
    await tasks.getByRole('button', { name: '查看任务', exact: true }).first().click()
    await expect(tasks.getByRole('region', { name: '飞书任务详情' })).toBeVisible()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 820))
    await expect
      .poll(() => tasks.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeLessThanOrEqual(1)
    await page.screenshot({ path: path.join(evidence, 'feishu-task-detail.png') })
    await tasks.getByRole('button', { name: '选择项目并准备对话', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const goal = dialog.getByRole('textbox', { name: '这次要完成什么？' })
    await expect(goal).toHaveValue(/task-1/)
    await expect(goal).toHaveValue(/飞书任务/)
    await goal.fill('请完成任务并给出测试结果。\n来源：飞书 task-1')
    await page.screenshot({ path: path.join(evidence, 'feishu-task-composer.png') })
    const create = dialog.getByRole('button', { name: /^创建并准备对话/ })
    await expect(create).toBeEnabled()
    await create.click()
    await expect(dialog).not.toBeVisible()
    const chat = page.locator('.native-chat-pane-shell')
    await expect(chat.locator('[contenteditable="true"]').first()).toContainText(
      '来源：飞书 task-1'
    )
    expect(readFileSync(codex.ledger, 'utf8')).not.toContain('"type":"input"')
    await page.screenshot({ path: path.join(evidence, 'feishu-codex-draft.png') })
    const calls: string[][] = readFileSync(cli.ledger, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    expect(
      calls
        .filter((args) => args.includes('task'))
        .every((args) => ['list', 'tasks', 'get'].includes(args[args.indexOf('task') + 2]))
    ).toBe(true)
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'feishu-task-receipt.json'),
      JSON.stringify(
        { packageFingerprint, calls, errors, liveFeishu: false, draftSent: false },
        null,
        2
      )
    )
  } catch (error) {
    writeFileSync(
      path.join(evidence, 'feishu-error-text.txt'),
      await page.locator('body').innerText()
    )
    await page.screenshot({ path: path.join(evidence, 'feishu-error.png') })
    throw error
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
