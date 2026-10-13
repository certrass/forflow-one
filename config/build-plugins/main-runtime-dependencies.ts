import packageJson from '../../package.json' with { type: 'json' }

export const BUNDLED_MAIN_DEPENDENCIES = new Set([
  'stream-json',
  'stream-chain',
  '@xterm/headless',
  '@xterm/addon-serialize',
  'tldts',
  'smol-toml',
  // Why: Windows NSIS deploys app.asar before external resources; bootstrap must
  // not race the later resources/node_modules copy.
  'zod'
])
export const EXTERNAL_MAIN_DEPENDENCIES = Object.keys(packageJson.dependencies).filter(
  (dependency) => !BUNDLED_MAIN_DEPENDENCIES.has(dependency)
)
