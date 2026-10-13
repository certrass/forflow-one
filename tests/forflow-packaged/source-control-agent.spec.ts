import { test, expect } from '@stablyai/playwright-test'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('Git AI explains an unsupported chat default and uses a separately selected Codex', async () => {
  const profile = privateProfile('source-control-agent')
  const script = path.join(profile, 'git-text.cjs')
  writeFileSync(
    script,
    `
if (process.argv.includes('--version')) { console.log('codex-cli 0.100.0'); process.exit(0) }
if (process.argv.includes('models')) { console.log('gpt-5.6-terra'); process.exit(0) }
process.stdin.resume()
process.stdin.on('end', () => console.log('feat: clarify source control AI selection'))
`
  )
  const seedPath = path.join(profile, 'orca-data.json')
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
  Object.assign(seed.settings, {
    defaultTuiAgent: 'aily',
    agentCmdOverrides: { codex: `"${process.execPath}" "${script}"` }
  })
  writeFileSync(seedPath, JSON.stringify(seed))
  const { app, page, errors } = await launch(profile)
  try {
    const worktreeId = await addPrivateProject(page, profile)
    const worktreePath = path.join(profile, '测试项目')
    writeFileSync(path.join(worktreePath, 'README.md'), '# Git AI 设置\n')
    execFileSync('git', ['add', 'README.md'], { cwd: worktreePath })
    const before = await page.evaluate((args) => window.api.git.generateCommitMessage(args), {
      worktreePath,
      worktreeId
    })
    expect(before).toEqual({
      success: false,
      error:
        '默认智能体暂不支持 Git 自动生成。请到「设置 → Git → 源代码管理 AI」选择 Codex 或其他可用智能体。'
    })
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: 'Git 和源代码控制', exact: true }).click()
    const section = page.locator('#source-control-ai-settings')
    const warning = section.getByText(/默认的豆包工作伙伴暂不支持自动生成文字/).first()
    await warning.scrollIntoViewIfNeeded()
    await expect(warning).toBeVisible()
    await page.screenshot({ path: path.join(evidence, 'git-ai-default-explanation.png') })
    for (const [actionId, label] of [
      ['branchName', '分支名称'],
      ['commitMessage', '提交说明'],
      ['pullRequest', '合并请求详情']
    ] as const) {
      const row = section
        .locator('div.rounded-md.border')
        .filter({ has: page.getByText(label, { exact: true }) })
        .first()
      await row.getByRole('combobox').click()
      await page.getByRole('option', { name: 'Codex', exact: true }).click()
      await expect
        .poll(
          async () =>
            (await page.evaluate(() => window.api.settings.get())).sourceControlAi?.actions?.[
              actionId
            ]?.agentId
        )
        .toBe('codex')
      await expect(row.getByText(/暂不支持/)).toHaveCount(0)
    }
    expect((await page.evaluate(() => window.api.settings.get())).defaultTuiAgent).toBe('aily')
    const after = await page.evaluate((args) => window.api.git.generateCommitMessage(args), {
      worktreePath,
      worktreeId
    })
    expect(after).toMatchObject({
      success: true,
      message: 'feat: clarify source control AI selection'
    })
    await section.getByText('分支名称', { exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(evidence, 'git-ai-separate-agent.png') })
    expect(errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'git-ai-separate-agent.json'),
      JSON.stringify(
        {
          packageFingerprint,
          chatAgent: 'aily',
          gitAgent: 'codex',
          generated: after.success,
          mockedCli: true
        },
        null,
        2
      )
    )
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
