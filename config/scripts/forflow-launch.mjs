#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const root = resolve(import.meta.dirname, '../..')
const mode = process.argv[2] ?? 'dev'
const scripts = { dev: 'dev', build: 'build:desktop', web: 'dev:web' }
if (!Object.hasOwn(scripts, mode)) {
  throw new Error('Expected dev, build, or web.')
}
const userDataPath = resolve(root, '.forflow/dev-profile')
const env = {
  ...process.env,
  FORFLOW_BUILD: '1',
  FORFLOW_DEPLOYMENT_PROFILE: 'cn-private',
  ORCA_DEV_USER_DATA_PATH: userDataPath,
  ORCA_DEV_DOCK_TITLE: 'Forflow One 开发版',
  ORCA_BACKGROUND_LAUNCH: process.argv.includes('--show') ? '0' : '1',
  ORCA_TELEMETRY_DISABLED: '1'
}
if (process.argv.includes('--dry-run')) {
  console.log(
    JSON.stringify(
      {
        product: 'Forflow One',
        script: scripts[mode],
        userDataPath,
        deploymentProfile: env.FORFLOW_DEPLOYMENT_PROFILE,
        background: env.ORCA_BACKGROUND_LAUNCH === '1'
      },
      null,
      2
    )
  )
} else {
  mkdirSync(userDataPath, { recursive: true, mode: 0o700 })
  const pnpm = process.env.npm_execpath
  if (!pnpm || !/pnpm/i.test(pnpm)) {
    throw new Error('Run this entry point through pnpm run dev:forflow or build:forflow.')
  }
  const child = spawn(process.execPath, [pnpm, 'run', scripts[mode]], {
    cwd: root,
    env,
    stdio: 'inherit',
    windowsHide: true
  })
  child.on('error', (error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  child.on('exit', (code) => {
    process.exitCode = code ?? 1
  })
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal))
  }
}
