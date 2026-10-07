import { _electron as electron } from '@stablyai/playwright-test'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  createElectronHomeIsolation,
  assertElectronResolvedIsolatedHome
} from '../e2e/helpers/electron-home-isolation'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'
const appPath = process.env.FORFLOW_PACKAGED_APP
const developmentMain = process.env.FORFLOW_QA_MAIN
const evidencePath = process.env.FORFLOW_QA_OUTPUT
if ((!appPath && !developmentMain) || !evidencePath) {
  throw new Error('Set FORFLOW_PACKAGED_APP or FORFLOW_QA_MAIN, and FORFLOW_QA_OUTPUT.')
}
export const evidence = evidencePath
mkdirSync(evidence, { recursive: true })
const executablePath = appPath ? path.join(appPath, 'Contents/MacOS/Forflow One') : undefined
export const packageFingerprint = appPath
  ? createHash('sha256')
      .update(readFileSync(path.join(appPath, 'Contents/Resources/app.asar')))
      .digest('hex')
  : 'development-build'

export async function launch(profile: string, extraEnv: Record<string, string> = {}) {
  const isolation = createElectronHomeIsolation({
    userDataDir: profile,
    inheritedEnv: {
      PATH: process.env.PATH,
      SHELL: '/bin/zsh',
      LANG: 'zh_CN.UTF-8',
      TMPDIR: process.env.TMPDIR
    },
    launchEnv: {},
    extraEnv: {
      ...extraEnv,
      ORCA_BACKGROUND_LAUNCH: '1',
      ORCA_E2E_HEADLESS: '1',
      NODE_ENV: 'production'
    }
  })
  const app = await electron.launch({
    executablePath,
    cwd: tmpdir(),
    args: [
      ...(!appPath && developmentMain ? [developmentMain] : []),
      '--password-store=basic',
      '--use-mock-keychain',
      '-ApplePersistenceIgnoreState',
      'YES'
    ],
    env: Object.fromEntries(
      Object.entries(isolation.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    )
  })
  assertElectronResolvedIsolatedHome(
    await app.evaluate(({ app }) => app.getPath('home')),
    isolation
  )
  const page = await app.firstWindow({ timeout: 60_000 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForFunction(() => Boolean(window.api))
  } catch (error) {
    writeFileSync(
      path.join(evidence, `${path.basename(profile)}-launch-error.json`),
      JSON.stringify(
        { url: page.url(), errors, windows: app.windows().map((window) => window.url()) },
        null,
        2
      )
    )
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
    throw error
  }
  return { app, page, errors }
}
