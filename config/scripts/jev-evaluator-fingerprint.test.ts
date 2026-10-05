import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it } from 'vitest'
import { jevEvaluatorFingerprint } from '../build-plugins/jev-evaluator-fingerprint'

it('binds evaluator code while excluding tests, duplicate copies and unrelated app code', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-fingerprint-'))
  const files = [
    'src/main/codex-usage/codex-review-evidence.ts',
    'src/main/codex-usage/codex-audit-message.ts',
    'src/main/review/workspace-review-file-access.ts',
    'src/main/review/workspace-review-source.ts',
    'src/main/review/workspace-sensitive-signals.ts',
    'src/shared/codex-review-types.ts',
    'src/shared/workspace-review-types.ts',
    'src/main/forflow/jev-audit-service.ts',
    'src/shared/jev-delivery-questions.ts'
  ]
  const write = (file: string, body: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), body)
  }
  try {
    files.forEach((file) => write(file, 'original\n'))
    const initial = jevEvaluatorFingerprint(root)
    write('src/main/forflow/jev-audit-service.test.ts', 'different test')
    write('src/main/forflow/jev-audit-service 2.ts', 'unrelated copy')
    write('src/shared/product-branding.ts', 'unrelated app change')
    expect(jevEvaluatorFingerprint(root)).toBe(initial)
    write('src/main/forflow/jev-audit-service.ts', 'changed evaluator')
    expect(jevEvaluatorFingerprint(root)).not.toBe(initial)
    rmSync(join(root, files[0]))
    expect(() => jevEvaluatorFingerprint(root)).toThrow()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

it('injects the evaluator fingerprint into all bundled desktop and browser targets', () => {
  for (const file of ['electron.vite.config.ts', 'vite.web.config.ts']) {
    expect(readFileSync(resolve(file), 'utf8')).toContain('__FORFLOW_JEV_EVALUATOR_HASH__')
  }
  expect(jevEvaluatorFingerprint()).toMatch(/^[a-f0-9]{64}$/)
})
