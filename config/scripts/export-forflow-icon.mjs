import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

if (process.platform !== 'darwin') {
  throw new Error('Export the macOS icon with sips and iconutil on macOS.')
}
const root = resolve(import.meta.dirname, '../..')
const temporary = mkdtempSync(join(tmpdir(), 'forflow-icon-'))
try {
  const iconset = join(temporary, 'Forflow.iconset')
  mkdirSync(iconset)
  for (const size of [16, 32, 128, 256, 512]) {
    for (const scale of [1, 2]) {
      const pixels = String(size * scale)
      const name = `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`
      execFileSync(
        '/usr/bin/sips',
        [
          '-z',
          pixels,
          pixels,
          join(root, 'resources/forflow/forflow-app-icon.png'),
          '--out',
          join(iconset, name)
        ],
        { stdio: 'pipe' }
      )
    }
  }
  execFileSync(
    '/usr/bin/iconutil',
    ['-c', 'icns', iconset, '-o', join(root, 'resources/forflow/icon.icns')],
    { stdio: 'inherit' }
  )
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
