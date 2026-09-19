import { test, expect, type ElectronApplication } from '@stablyai/playwright-test'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'
import { getE2ECompletedOnboardingProfile } from '../e2e/helpers/e2e-completed-onboarding-profile'

test('official API accounts: encrypted persistence, explicit mock probes, failure and removal', async () => {
  const profile = realpathSync(mkdtempSync(path.join(tmpdir(), 'forflow-model-accounts-')))
  const seed = getE2ECompletedOnboardingProfile()
  writeFileSync(
    path.join(profile, 'orca-data.json'),
    JSON.stringify({ ...seed, settings: { ...seed.settings, uiLanguage: 'zh' } })
  )
  const syntheticKey = 'sk-forflow-packaged-test-never-real'
  const providers = [
    { id: 'kimi', label: 'Kimi' },
    { id: 'zhipu', label: '智谱 GLM' },
    { id: 'deepseek', label: 'DeepSeek' }
  ]
  let running: ElectronApplication | null = null
  try {
    const { app, page, errors } = await launch(profile)
    running = app
    await app.evaluate(() => {
      const original = globalThis.fetch
      process.env.FORFLOW_QA_MODEL_PROBE_COUNT = '0'
      globalThis.fetch = async (input, init) => {
        const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
        if (!['api.moonshot.cn', 'open.bigmodel.cn', 'api.deepseek.com'].includes(url.hostname)) {
          return original(input, init)
        }
        process.env.FORFLOW_QA_MODEL_PROBE_COUNT = String(
          Number(process.env.FORFLOW_QA_MODEL_PROBE_COUNT) + 1
        )
        if (
          init?.method !== 'POST' ||
          init.redirect !== 'error' ||
          new Headers(init.headers).get('Authorization') !==
            'Bearer sk-forflow-packaged-test-never-real'
        ) {
          throw new Error('Unexpected test request')
        }
        const status = Number(process.env.FORFLOW_QA_MODEL_PROBE_STATUS ?? '200')
        return new Response(
          JSON.stringify({ choices: [{ message: { content: 'MOCK_OK' }, finish_reason: 'stop' }] }),
          { status, headers: { 'Content-Type': 'application/json' } }
        )
      }
    })
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: /^AI 提供商账户/ }).click()
    for (const provider of providers) {
      const card = page.getByRole('region', { name: provider.label, exact: true })
      await expect(card).toContainText('尚未配置')
      await card.getByLabel('模型名称', { exact: true }).fill('synthetic-model')
      await card.getByLabel('API Key', { exact: true }).fill(syntheticKey)
      await card.getByRole('button', { name: '保存配置', exact: true }).click()
      await expect(card).toContainText('已保存，尚未验证连接。')
      await expect(card.getByLabel('API Key', { exact: true })).toHaveValue('')
      const sealed = path.join(profile, `forflow-model-account-${provider.id}.sealed`)
      expect(readFileSync(sealed).includes(Buffer.from(syntheticKey))).toBe(false)
      expect(statSync(sealed).mode & 0o777).toBe(0o600)
    }
    expect(await app.evaluate(() => process.env.FORFLOW_QA_MODEL_PROBE_COUNT)).toBe('0')
    const status = await page.evaluate(() => window.api.forflowModelAccounts!.list())
    expect(status).toHaveLength(3)
    expect(JSON.stringify(status)).not.toContain(syntheticKey)
    expect(readFileSync(path.join(profile, 'orca-data.json'), 'utf8')).not.toContain(syntheticKey)
    for (const provider of providers) {
      const card = page.getByRole('region', { name: provider.label, exact: true })
      await card.getByRole('button', { name: '测试连接', exact: true }).click()
      await expect(card).toContainText('提供商已接受请求并返回内容')
    }
    expect(await app.evaluate(() => process.env.FORFLOW_QA_MODEL_PROBE_COUNT)).toBe('3')
    const kimi = page.getByRole('region', { name: 'Kimi', exact: true })
    await kimi.getByLabel('模型名称', { exact: true }).fill('synthetic-model-updated')
    await expect(kimi.getByRole('button', { name: '测试连接', exact: true })).toBeDisabled()
    await kimi.getByRole('button', { name: '保存配置', exact: true }).click()
    await expect(kimi).toContainText('已保存，尚未验证连接。')
    await kimi.getByRole('button', { name: '测试连接', exact: true }).click()
    await expect(kimi).toContainText('提供商已接受请求并返回内容')
    await app.evaluate(() => {
      process.env.FORFLOW_QA_MODEL_PROBE_STATUS = '401'
    })
    await kimi.getByRole('button', { name: '测试连接', exact: true }).click()
    await expect(kimi.getByRole('alert')).toContainText('认证失败')
    await page.screenshot({ path: path.join(evidence, 'model-accounts-chinese.png') })
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((w) => w.isVisible())
      )
    ).toBe(false)
    await closeElectronAppForE2E(app)
    running = null
    const resumed = await launch(profile)
    running = resumed.app
    await resumed.page.getByRole('button', { name: /^AI 提供商账户/ }).click()
    for (const provider of providers) {
      const card = resumed.page.getByRole('region', { name: provider.label, exact: true })
      await expect(card).toContainText('已保存 API 配置')
      await expect(card.getByLabel('模型名称', { exact: true })).toHaveValue(
        provider.id === 'kimi' ? 'synthetic-model-updated' : 'synthetic-model'
      )
      await expect(card.getByLabel('API Key', { exact: true })).toHaveValue('')
      await card.getByRole('button', { name: '移除配置', exact: true }).click()
      await expect(card).toContainText('已移除此 API 配置。')
      expect(existsSync(path.join(profile, `forflow-model-account-${provider.id}.sealed`))).toBe(
        false
      )
    }
    expect(resumed.errors).toEqual([])
    writeFileSync(
      path.join(evidence, 'model-accounts.json'),
      JSON.stringify(
        {
          packageFingerprint,
          providers: providers.map((provider) => provider.id),
          network: 'mock fetch; no vendor requests',
          encryption: 'Electron safeStorage with mock keychain in isolated HOME',
          verifiedAt: new Date().toISOString()
        },
        null,
        2
      )
    )
  } finally {
    if (running) {
      await closeElectronAppForE2E(running)
    }
    await cleanupE2EDaemons(profile)
  }
})
