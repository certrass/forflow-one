import { test, expect } from '@stablyai/playwright-test'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('landing omits the logo while saved blue Orca preference uses Forflow artwork in settings, Dock and windows', async () => {
  const profile = privateProfile('brand-migration')
  const seedPath = path.join(profile, 'orca-data.json')
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
  seed.settings.appIcon = 'blue'
  writeFileSync(seedPath, JSON.stringify(seed))
  const { app, page, errors } = await launch(profile)
  try {
    const logo = page.getByRole('img', { name: 'Forflow One 标志', exact: true })
    await expect(logo).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Forflow One', exact: true })).toBeVisible()
    await expect(page.getByText('打开 GitHub', { exact: true })).toHaveCount(0)
    await expect(
      page.getByText('面向 AI 与研发团队的私有化智能体工作台。', { exact: false })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: '创建工作区', exact: true })).toBeVisible()
    await expect(page.locator('body')).toContainText('上一个工作区')
    await expect(page.locator('body')).toContainText('下一个工作区')
    await expect(page.locator('body')).not.toContainText(
      /Create workspace|Move up workspace|Move down workspace/
    )
    await page.screenshot({ path: path.join(evidence, 'brand-landing.png') })
    const captures = await app.evaluateHandle(
      ({ app, BrowserWindow, nativeImage }, source) => {
        const hash = (image: Electron.NativeImage) => image.toDataURL()
        const sourceImage = nativeImage.createFromBuffer(Buffer.from(source, 'base64'))
        const expected = hash(sourceImage)
        const bitmap = sourceImage.toBitmap()
        const { width, height } = sourceImage.getSize()
        const alphaAt = (x: number, y: number) => bitmap[(y * width + x) * 4 + 3]
        const cornerAlpha = [
          [0, 0],
          [width - 1, 0],
          [0, height - 1],
          [width - 1, height - 1]
        ].map(([x, y]) => alphaAt(x, y))
        const centerAlpha = alphaAt(Math.floor(width / 2), Math.floor(height / 2))
        const dock: string[] = []
        const windows: string[] = []
        const originalDock = app.dock!.setIcon
        const originalWindow = BrowserWindow.prototype.setIcon
        app.dock!.setIcon = (image) => {
          if (typeof image !== 'string') {
            dock.push(hash(image))
          }
        }
        BrowserWindow.prototype.setIcon = function (image) {
          if (typeof image !== 'string') {
            windows.push(hash(image))
          }
        }
        return {
          expected,
          cornerAlpha,
          centerAlpha,
          dock,
          windows,
          restore: () => {
            app.dock!.setIcon = originalDock
            BrowserWindow.prototype.setIcon = originalWindow
          }
        }
      },
      readFileSync(path.resolve('resources/forflow/forflow-app-icon.png')).toString('base64')
    )
    try {
      for (const appIcon of ['classic', 'watercolor', 'blue'] as const) {
        await page.evaluate((appIcon) => window.api.settings.set({ appIcon }), appIcon)
      }
      const actual = await captures.evaluate(
        ({ expected, cornerAlpha, centerAlpha, dock, windows }) => ({
          expected,
          cornerAlpha,
          centerAlpha,
          dock,
          windows
        })
      )
      expect(actual.cornerAlpha).toEqual([0, 0, 0, 0])
      expect(actual.centerAlpha).toBe(255)
      expect(actual.dock).toHaveLength(3)
      expect(actual.windows.length).toBeGreaterThanOrEqual(3)
      expect([...actual.dock, ...actual.windows].every((hash) => hash === actual.expected)).toBe(
        true
      )
      writeFileSync(
        path.join(evidence, 'brand-native-icons.json'),
        JSON.stringify(
          {
            packageFingerprint,
            cornerAlpha: actual.cornerAlpha,
            centerAlpha: actual.centerAlpha,
            expected: createHash('sha256').update(actual.expected).digest('hex'),
            dock: actual.dock.map((value) => createHash('sha256').update(value).digest('hex')),
            windows: actual.windows.map((value) => createHash('sha256').update(value).digest('hex'))
          },
          null,
          2
        )
      )
    } finally {
      await captures.evaluate((value) => value.restore())
    }
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '外观', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Forflow One', exact: true })).toBeVisible()
    await expect(page.locator('img[src*="orca-blue"], img[src*="orca-watercolor"]')).toHaveCount(0)
    await page.getByRole('img', { name: 'Forflow One', exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(evidence, 'brand-appearance.png') })
    const about = await app.evaluate(({ app }) => {
      const calls: Electron.AboutPanelOptionsOptions[] = []
      const original = app.setAboutPanelOptions
      app.setAboutPanelOptions = (options) => {
        calls.push(options)
        original.call(app, options)
      }
      try {
        app.emit('gpu-info-update')
      } finally {
        app.setAboutPanelOptions = original
      }
      return calls
    })
    expect(about).toHaveLength(1)
    expect(about[0].applicationName).toBe('Forflow One')
    expect(about[0].credits).toContain('面向 AI 与研发团队的私有化智能体工作台。')
    expect(about[0].credits).toContain('图形加速')
    expect(about[0].credits).not.toMatch(/Orca|GPU acceleration|Status unavailable/)
    const nativeMenu = await app.evaluate(({ Menu }) =>
      Menu.getApplicationMenu()?.items.flatMap(
        (item) =>
          item.submenu?.items.map((entry) => ({ role: entry.role, label: entry.label })) ?? []
      )
    )
    expect(nativeMenu).toEqual(
      expect.arrayContaining([
        { role: 'about', label: '关于 Forflow One' },
        { role: 'hide', label: '隐藏 Forflow One' },
        { role: 'hideothers', label: '隐藏其他应用' },
        { role: 'quit', label: '退出 Forflow One' }
      ])
    )
    writeFileSync(
      path.join(evidence, 'about-panel-options.json'),
      JSON.stringify({ packageFingerprint, about, nativeMenu }, null, 2)
    )
    expect(errors).toEqual([])
  } finally {
    writeFileSync(
      path.join(evidence, 'brand-final-dom.txt'),
      await page
        .locator('body')
        .innerText()
        .catch(() => 'closed')
    )
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
