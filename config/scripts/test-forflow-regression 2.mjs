#!/usr/bin/env node
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '../..')
const suite = JSON.parse(
  readFileSync(resolve(root, 'resources/forflow/regression-suite.json'), 'utf8')
)
const pnpm = process.env.npm_execpath
if (!pnpm || !/pnpm/i.test(pnpm)) {
  throw new Error('请使用 pnpm run test:forflow:regression。')
}
mkdirSync(resolve(root, '.forflow/evidence'), { recursive: true })
execFileSync(
  process.execPath,
  [
    pnpm,
    'exec',
    'vitest',
    'run',
    '--config',
    'config/vitest.config.ts',
    ...suite,
    '--reporter=default',
    '--reporter=json',
    `--outputFile=${process.env.FORFLOW_REGRESSION_REPORT || '.forflow/evidence/private-v3-unit-tests.json'}`
  ],
  { cwd: root, env: { ...process.env, ORCA_BACKGROUND_LAUNCH: '1' }, stdio: 'inherit' }
)
