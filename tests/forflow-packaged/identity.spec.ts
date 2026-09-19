import { test, expect, type ElectronApplication } from '@stablyai/playwright-test'
import { mkdtempSync, writeFileSync, realpathSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'
import { getE2ECompletedOnboardingProfile } from '../e2e/helpers/e2e-completed-onboarding-profile'
import { IdentityStore } from '../../services/identity/identity-store.mjs'
import { createIdentityHttpServer } from '../../services/identity/http-server.mjs'

const password = 'Forflow-test-only-2026!'

test('identity regression: private server, Chinese account UI, revocation, persistence and no upstream fallback', async () => {
  const profile = realpathSync(mkdtempSync(path.join(tmpdir(), 'forflow-identity-ui-')))
  const serviceDirectory = path.join(profile, 'identity-service')
  mkdirSync(serviceDirectory)
  const store = new IdentityStore(serviceDirectory)
  await store.createUser({
    username: 'admin',
    displayName: '本机测试管理员',
    password,
    role: 'admin'
  })
  const server = createIdentityHttpServer(store)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('测试服务未监听 TCP')
  }
  const serverUrl = `http://127.0.0.1:${address.port}`
  const requests: string[] = []
  server.on('request', (request) => requests.push(`${request.method} ${request.url}`))
  const seed = getE2ECompletedOnboardingProfile()
  writeFileSync(
    path.join(profile, 'orca-data.json'),
    JSON.stringify({ ...seed, settings: { ...seed.settings, uiLanguage: 'zh' } })
  )
  let running: ElectronApplication | null = null
  let serviceClosed = false
  try {
    const { app, page, errors } = await launch(profile)
    running = app
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: 'Forflow 企业账号', exact: true }).click()
    const account = page.getByTestId('forflow-account')
    await expect(account).toContainText('本机模式')
    const deniedEndpoints = await app.evaluate(async () => {
      const urls = [
        'https://login.onorca.dev',
        'https://relay.onorca.dev',
        'https://app.orca.dev/skills',
        'https://github.com/stablyai/orca/releases'
      ]
      return Promise.all(
        urls.map(async (url) => {
          try {
            await fetch(url)
            return { url, blocked: false }
          } catch (error) {
            return { url, blocked: error instanceof Error && error.message.includes('已阻止') }
          }
        })
      )
    })
    expect(deniedEndpoints.every((entry) => entry.blocked)).toBe(true)
    const chromiumDenied = await app.evaluate(async ({ net }) => {
      try {
        await net.fetch('https://login.onorca.dev', { signal: AbortSignal.timeout(5000) })
        return 'not-blocked'
      } catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
    })
    expect(chromiumDenied).toContain('ERR_BLOCKED_BY_CLIENT')

    await page.getByLabel('身份服务地址', { exact: true }).fill('https://login.onorca.dev')
    await page.getByRole('button', { name: '保存并检测', exact: true }).click()
    await expect(account.getByRole('alert')).toContainText('不接受 Orca 上游')
    expect(requests).toEqual([])
    await page.getByLabel('身份服务地址', { exact: true }).fill(serverUrl)
    await page.getByRole('button', { name: '保存并检测', exact: true }).click()
    await page.getByLabel('账号', { exact: true }).fill('admin')
    await page.getByLabel('密码', { exact: true }).fill('wrong-password')
    await page.getByRole('button', { name: '登录 Forflow', exact: true }).click()
    await expect(account.getByRole('alert')).toContainText('账号或密码不正确')
    await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
    await page.getByLabel('密码', { exact: true }).fill(password)
    await page.getByRole('button', { name: '登录 Forflow', exact: true }).click()
    await expect(account).toContainText('本机测试管理员 · admin')
    await page.getByLabel('新成员账号', { exact: true }).fill('研发成员')
    await page.getByLabel('成员姓名', { exact: true }).fill('中文测试成员')
    await page.getByLabel('初始密码（至少 12 个字符）', { exact: true }).fill(password)
    await page.getByRole('button', { name: '创建成员账号', exact: true }).click()
    await expect(account).toContainText('中文测试成员 · 研发成员')
    const memberRow = account
      .locator('.divide-y > div')
      .filter({ hasText: '中文测试成员 · 研发成员' })
    const memberSession = await store.login({ username: '研发成员', password })
    await memberRow.getByRole('button', { name: '停用并撤销会话', exact: true }).click()
    await expect(memberRow).toContainText('已停用')
    expect(() => store.authenticate(memberSession.token)).toThrow('登录已失效')
    await memberRow.getByRole('button', { name: '启用', exact: true }).click()
    await memberRow.getByRole('button', { name: '重置密码', exact: true }).click()
    await page
      .getByLabel('为 中文测试成员 设置新密码（至少 12 个字符）', { exact: true })
      .fill(`${password}-changed`)
    await page.getByRole('button', { name: '保存新密码', exact: true }).click()
    await expect(page.locator('#forflow-reset-password')).toHaveCount(0)
    await expect(store.login({ username: '研发成员', password })).rejects.toThrow(
      '账号或密码不正确'
    )
    await page.getByRole('button', { name: '核验并查看最近审计记录', exact: true }).click()
    await expect(account).toContainText('已核验')
    await expect(account).toContainText('重置密码 · 成功')
    await page.screenshot({ path: path.join(evidence, 'identity-admin-audit.png') })
    const state = await page.evaluate(() => window.api.forflowIdentity!.status())
    expect(state.state).toBe('connected')
    expect(JSON.stringify(state)).not.toContain(memberSession.token)
    await closeElectronAppForE2E(app)
    running = null
    const resumed = await launch(profile)
    running = resumed.app
    await expect(resumed.page.getByTestId('forflow-release')).toContainText(
      '当前版本：1.4.205-forflow.4'
    )
    await expect(resumed.page.locator('body')).not.toContainText('Register /usr/local/bin')
    await expect(resumed.page.locator('body')).not.toContainText('Before opening setup')
    await expect(resumed.page.locator('body')).toContainText(
      '将安装包内置技能写入本机 ~/.agents/skills'
    )
    await resumed.page.screenshot({
      path: path.join(evidence, 'settings-chinese-private-release.png')
    })
    await resumed.page.getByRole('button', { name: 'Forflow 企业账号', exact: true }).click()
    await expect(resumed.page.getByTestId('forflow-account')).toBeVisible()
    if (state.persistence === 'encrypted') {
      await expect(resumed.page.getByTestId('forflow-account')).toContainText(
        '本机测试管理员 · admin'
      )
    } else {
      await resumed.page.getByLabel('账号', { exact: true }).fill('admin')
      await resumed.page.getByLabel('密码', { exact: true }).fill(password)
      await resumed.page.getByRole('button', { name: '登录 Forflow', exact: true }).click()
    }
    const adminRow = resumed.page
      .getByTestId('forflow-account')
      .locator('.divide-y > div')
      .filter({ hasText: '本机测试管理员 · admin' })
    await adminRow.getByRole('button', { name: '重置密码', exact: true }).click()
    await resumed.page
      .getByLabel('为 本机测试管理员 设置新密码（至少 12 个字符）', { exact: true })
      .fill(`${password}-admin-changed`)
    await resumed.page.getByRole('button', { name: '保存新密码', exact: true }).click()
    await expect(
      resumed.page.getByRole('button', { name: '登录 Forflow', exact: true })
    ).toBeVisible()
    await resumed.page.getByLabel('账号', { exact: true }).fill('admin')
    await resumed.page.getByLabel('密码', { exact: true }).fill(`${password}-admin-changed`)
    await resumed.page.getByRole('button', { name: '登录 Forflow', exact: true }).click()
    await expect(resumed.page.getByTestId('forflow-account')).toContainText(
      '本机测试管理员 · admin'
    )
    await resumed.page.getByRole('button', { name: '退出登录', exact: true }).click()
    await expect(
      resumed.page.getByRole('button', { name: '登录 Forflow', exact: true })
    ).toBeVisible()
    expect(
      (await resumed.page.evaluate(() => window.api.forflowIdentity!.status())).session
    ).toBeNull()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    serviceClosed = true
    await resumed.page.getByLabel('账号', { exact: true }).fill('admin')
    await resumed.page.getByLabel('密码', { exact: true }).fill(password)
    await resumed.page.getByRole('button', { name: '登录 Forflow', exact: true }).click()
    await expect(resumed.page.getByRole('alert')).toContainText('无法连接 Forflow 身份服务')
    expect(
      (await resumed.page.evaluate(() => window.api.forflowIdentity!.status())).session
    ).toBeNull()
    await resumed.page.getByRole('button', { name: '切换为本机使用', exact: true }).click()
    await expect(resumed.page.getByTestId('forflow-account')).toContainText('本机模式')
    await resumed.page.screenshot({ path: path.join(evidence, 'identity-local-mode.png') })
    expect(errors).toEqual([])
    expect(resumed.errors).toEqual([])
    const audit = store.auditPage()
    expect(JSON.stringify(audit)).not.toContain(password)
    writeFileSync(
      path.join(evidence, 'identity-regression.json'),
      JSON.stringify(
        {
          packageFingerprint,
          server: 'isolated-loopback-service',
          scenarios: [
            'upstream-refused-before-network',
            'login-failure-and-success',
            'Chinese-user-create',
            'disable-revokes',
            'enable',
            'password-reset',
            'own-password-reset-signs-out',
            'audit-chain',
            'restart-session',
            'logout',
            'offline-no-fallback',
            'local-mode'
          ],
          deniedEndpoints,
          chromiumDenied,
          requests,
          persistence: state.persistence,
          verification: store.verifyAudit(),
          rendererErrors: [...errors, ...resumed.errors]
        },
        null,
        2
      )
    )
  } finally {
    if (running) {
      await closeElectronAppForE2E(running)
    }
    if (!serviceClosed) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    store.close()
    await cleanupE2EDaemons(profile)
  }
})
