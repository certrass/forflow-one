import { test, expect, type Locator } from '@stablyai/playwright-test'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

const steps = [
  ['notifications', '开启通知', '及时获知智能体已完成工作、需要关注或遇到阻塞。'],
  ['default-agent', '选择默认智能体', '预先选好常用智能体，更快开始新工作。'],
  [
    'agent-capabilities',
    '启用 Forflow One CLI',
    '注册 Forflow One 命令行入口，并安装浏览器、计算机操作及编排工作流所需的智能体技能。'
  ],
  ['task-sources', '连接集成服务', '一键从任务启动智能体，并持续查看 PR 状态。'],
  [
    'setup-script',
    '自动配置工作区',
    '自动运行安装和初始化命令，让每个新工作树都能直接用于智能体工作。'
  ],
  [
    'add-two-repos',
    '在多个仓库中开始工作',
    '将常用仓库加入 Forflow One，无需到处查找文件夹即可启动智能体工作。'
  ],
  [
    'two-worktrees',
    '多任务并行',
    '同时在两个不同的工作树中工作。即使属于同一项目，它们也相互隔离，适合同时开发两个功能。'
  ],
  [
    'browser',
    '使用 Forflow One 浏览器',
    '无需离开 Forflow One 即可浏览 Web 应用。选中任意元素，即可一键将其准确源码与样式发送给智能体。'
  ]
] as const

async function verifySteps(surface: Locator): Promise<void> {
  await expect(surface.locator('[data-setup-step-id]')).toHaveCount(8)
  for (const [id, title, description] of steps) {
    const row = surface.locator(`[data-setup-step-id="${id}"]`)
    await expect(row).toContainText(title)
    await row.click()
    await expect(row).toHaveAttribute('aria-current', 'step')
    await expect(surface.getByText(title, { exact: true })).toHaveCount(2)
    await expect(surface.getByText(title, { exact: true }).last()).toBeVisible()
    await expect(surface.getByText(description, { exact: true })).toBeVisible()
    await expect(surface).not.toContainText(
      /Turn on notifications|Choose your default agent|Enable Forflow One CLI|Connect integrations|Automate workspace setup|Start work in multiple repos|Multi-task|Use Forflow One's browser|Register the Forflow One shell command|\bOrca\b|手机光标/
    )
  }
}

test('Chinese guide titles and descriptions render in both the modal and settings, including after restart', async () => {
  const profile = privateProfile('guide-language')
  for (let run = 0; run < 2; run++) {
    const { app, page, errors } = await launch(profile)
    try {
      if (run > 0) {
        await page.getByRole('button', { name: /^入门清单，/ }).click()
        await verifySteps(page.locator('#settings-section-setup-guide, #setup-guide'))
        await page.getByRole('button', { name: /返回应用/ }).click()
      }
      await page.getByRole('button', { name: '帮助', exact: true }).click()
      await page.getByRole('menuitem', { name: /里程碑/ }).click()
      const modal = page.getByRole('dialog')
      await verifySteps(modal)
      await modal.locator('[data-setup-step-id="agent-capabilities"]').click()
      if (run === 0) {
        await page.screenshot({ path: path.join(evidence, 'guide-modal-chinese.png') })
        writeFileSync(path.join(evidence, 'guide-modal-dom.txt'), await modal.innerText())
      }
      await page.keyboard.press('Escape')
      await expect(modal).toHaveCount(0)
      await page.getByRole('button', { name: '设置', exact: true }).click()
      await page.getByRole('button', { name: /^入门清单，/ }).click()
      const embedded = page.locator('#settings-section-setup-guide, #setup-guide')
      await verifySteps(embedded)
      await embedded.locator('[data-setup-step-id="agent-capabilities"]').click()
      await expect(embedded).toContainText('让智能体操作桌面、移动光标、点击，并在应用中输入。')
      await page.screenshot({ path: path.join(evidence, `guide-settings-chinese-${run}.png`) })
      expect(errors).toEqual([])
    } finally {
      writeFileSync(
        path.join(evidence, `guide-language-${run}-dom.txt`),
        await page
          .locator('body')
          .innerText()
          .catch(() => 'closed')
      )
      await closeElectronAppForE2E(app)
      await cleanupE2EDaemons(profile)
    }
  }
  writeFileSync(
    path.join(evidence, 'guide-language-result.json'),
    JSON.stringify(
      {
        packageFingerprint,
        surfaces: ['modal', 'settings'],
        restarts: 1,
        namesAndDescriptions: steps,
        passed: true
      },
      null,
      2
    )
  )
})
