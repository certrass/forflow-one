import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

export function resolveWorkBuddyCli(): string | null {
  const override = process.env.FORFLOW_WORKBUDDY_CLI?.trim()
  const candidates = override
    ? [resolve(override)]
    : process.platform === 'darwin'
      ? ['/Applications', join(homedir(), 'Applications')].map((root) =>
          join(
            root,
            'WorkBuddy.app',
            'Contents',
            'Resources',
            'app.asar.unpacked',
            'cli',
            'bin',
            'codebuddy'
          )
        )
      : []
  for (const file of candidates) {
    try {
      const product: unknown = JSON.parse(
        readFileSync(join(dirname(dirname(file)), 'product.json'), 'utf8')
      )
      if (
        existsSync(file) &&
        typeof product === 'object' &&
        product !== null &&
        'productName' in product &&
        product.productName === 'WorkBuddy'
      ) {
        return file
      }
    } catch {
      /* The desktop installation can move during an update. */
    }
  }
  return null
}
