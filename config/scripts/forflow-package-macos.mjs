#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

const root = resolve(import.meta.dirname, '../..')
const profile = JSON.parse(
  readFileSync(resolve(root, 'resources/forflow/release-profile.json'), 'utf8')
)
if (process.versions.node !== profile.node) {
  throw new Error(`构建要求 Node.js ${profile.node}，当前为 ${process.versions.node}。`)
}
if (process.platform !== 'darwin' || process.arch !== 'arm64') {
  throw new Error('The current Forflow One test-release profile is validated for macOS arm64.')
}
const steps = [
  ['run', 'verify:forflow:localization'],
  ['run', 'tc'],
  ['run', 'test:forflow:identity'],
  ['run', 'test:forflow:regression', '--maxWorkers=2'],
  ['run', 'build:forflow'],
  ['exec', 'node', 'config/scripts/build-computer-macos.mjs', '--single-arch'],
  ['exec', 'node', 'config/scripts/build-keyboard-layout-macos.mjs', '--single-arch'],
  [
    'exec',
    'node',
    'config/scripts/build-notification-status-macos.mjs',
    '--single-arch',
    '--bundle-id',
    'cn.forflow.one'
  ],
  [
    'exec',
    'electron-builder',
    '--config',
    'config/electron-builder.forflow.cjs',
    '--mac',
    '--arm64',
    '--dir',
    '--publish',
    'never'
  ]
]
if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ product: 'Forflow One', profile, steps }, null, 2))
} else {
  const pnpm = process.env.npm_execpath
  if (!pnpm || !/pnpm/i.test(pnpm)) {
    throw new Error('Use pnpm run package:forflow:mac.')
  }
  const version = execFileSync(process.execPath, [pnpm, '--version'], { encoding: 'utf8' }).trim()
  if (`pnpm@${version}` !== profile.packageManager) {
    throw new Error(`构建要求 ${profile.packageManager}。`)
  }
  for (const args of steps) {
    execFileSync(process.execPath, [pnpm, ...args], {
      cwd: root,
      env: {
        ...process.env,
        FORFLOW_BUILD: '1',
        CSC_IDENTITY_AUTO_DISCOVERY: 'false',
        ORCA_COMPUTER_MACOS_SIGN_IDENTITY: '-',
        ORCA_BACKGROUND_LAUNCH: '1'
      },
      stdio: 'inherit'
    })
  }
}
