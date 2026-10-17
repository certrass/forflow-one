const path = require('node:path')
const fs = require('node:fs')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, '..', 'src', 'shared')
const productRoot = path.resolve(projectRoot, '..', 'resources', 'forflow')
const dependencyRoot = fs.realpathSync(path.join(projectRoot, 'node_modules'))

const config = getDefaultConfig(projectRoot)

// Why: mobile source-control prompts use the same pure builders as desktop.
// Metro only watches mobile/ by default, so make repo-root shared modules visible.
// Shared worktree dependencies must be inside Metro's file map, even when symlinked.
config.watchFolders = Array.from(
  new Set([...(config.watchFolders ?? []), sharedRoot, productRoot, dependencyRoot])
)

module.exports = config
