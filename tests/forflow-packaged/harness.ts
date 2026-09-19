import { _electron as electron } from '@stablyai/playwright-test'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  createElectronHomeIsolation,
  assertElectronResolvedIsolatedHome
} from '../e2e/helpers/electron-home-isolation'
const appPath = process.env.FORFLOW_PACKAGED_APP
const evidencePath = process.env.FORFLOW_QA_OUTPUT
if (!appPath || !evidencePath) {
  throw new Error('Set FORFLOW_PACKAGED_APP and FORFLOW_QA_OUTPUT.')
}
export const evidence = evidencePath
mkdirSync(evidence, { recursive: true })
const executablePath = path.join(appPath, 'Contents/MacOS/Forflow One')
export const packageFingerprint = createHash('sha256')
  .update(readFileSync(path.join(appPath, 'Contents/Resources/app.asar')))
  .digest('hex')

export async function launch(profile: string) {
  const isolation = createElectronHomeIsolation({
    userDataDir: profile,
    inheritedEnv: {
      PATH: process.env.PATH,
      SHELL: '/bin/zsh',
      LANG: 'zh_CN.UTF-8',
      TMPDIR: process.env.TMPDIR
    },
    launchEnv: {},
    extraEnv: { ORCA_BACKGROUND_LAUNCH: '1', ORCA_E2E_HEADLESS: '1', NODE_ENV: 'production' }
  })
  const app = await electron.launch({
    executablePath,
    cwd: tmpdir(),
    args: ['--password-store=basic', '--use-mock-keychain', '-ApplePersistenceIgnoreState', 'YES'],
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
  await page.waitForFunction(() => Boolean(window.api))
  return { app, page, errors }
}
