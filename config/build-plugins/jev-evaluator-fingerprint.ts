import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dependencies = [
  'src/main/codex-usage/codex-review-evidence.ts',
  'src/main/codex-usage/codex-audit-message.ts',
  'src/main/review/workspace-review-file-access.ts',
  'src/main/review/workspace-review-source.ts',
  'src/main/review/workspace-sensitive-signals.ts',
  'src/shared/codex-review-types.ts',
  'src/shared/workspace-review-types.ts'
]

export function jevEvaluatorFingerprint(root = process.cwd()): string {
  const files = [...dependencies]
  for (const directory of ['src/main/forflow', 'src/shared']) {
    files.push(
      ...readdirSync(resolve(root, directory))
        .filter((file) => /^jev-[a-z-]+\.ts$/.test(file))
        .map((file) => `${directory}/${file}`)
    )
  }
  return createHash('sha256')
    .update(
      JSON.stringify(
        files
          .sort()
          .map((file) => [file, readFileSync(resolve(root, file), 'utf8').replace(/\r\n/g, '\n')])
      )
    )
    .digest('hex')
}
