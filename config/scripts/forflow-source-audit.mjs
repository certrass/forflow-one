#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

const root = resolve(import.meta.dirname, '../..')
const readJson = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'))
const git = (args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim()
const files = git(['ls-files', '-z']).split('\0').filter(Boolean)
const product = readJson('resources/forflow/product.json')
const pkg = readJson('package.json')
const flatten = (value, prefix = '', result = {}) => {
  for (const [key, entry] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (typeof entry === 'string') {
      result[name] = entry
    } else if (entry && typeof entry === 'object') {
      flatten(entry, name, result)
    }
  }
  return result
}
const en = flatten(readJson('src/renderer/src/i18n/locales/en.json'))
const zh = flatten(readJson('src/renderer/src/i18n/locales/zh.json'))
const domains = new Map()
const runtimeFiles = files.filter(
  (f) =>
    /^(src|mobile\/src|cloud\/apps\/[^/]+\/src)\//.test(f) &&
    /\.(ts|tsx|js|json)$/.test(f) &&
    !/(test|fixture|\/i18n\/locales\/)/.test(f)
)
for (const file of runtimeFiles) {
  const content = readFileSync(resolve(root, file), 'utf8')
  for (const match of content.matchAll(
    /(?:https?|wss?):\/\/([a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,})/g
  )) {
    const host = match[1].toLowerCase()
    if (!domains.has(host)) {
      domains.set(host, new Set())
    }
    domains.get(host).add(file)
  }
}
const directDependencies = Object.entries({ ...pkg.dependencies, ...pkg.optionalDependencies }).map(
  ([name, requested]) => {
    try {
      const installed = readJson(`node_modules/${name}/package.json`)
      return {
        name,
        requested,
        installed: installed.version,
        license: installed.license ?? 'NOT_DECLARED'
      }
    } catch {
      return { name, requested, installed: null, license: 'NOT_INSPECTED' }
    }
  }
)
const report = {
  generatedAt: new Date().toISOString(),
  scope:
    'Static tracked-source inventory and installed direct dependencies. Not a full SBOM, license opinion or network trace.',
  product,
  head: git(['rev-parse', 'HEAD']),
  branch: git(['branch', '--show-current']),
  lockfileSha256: createHash('sha256')
    .update(readFileSync(resolve(root, 'pnpm-lock.yaml')))
    .digest('hex'),
  trackedFiles: files.length,
  topLevelCounts: Object.fromEntries(
    [...new Set(files.map((f) => f.split('/')[0]))].map((dir) => [
      dir,
      files.filter((f) => f.split('/')[0] === dir).length
    ])
  ),
  localization: {
    englishKeys: Object.keys(en).length,
    chineseKeys: Object.keys(zh).length,
    missingChineseKeys: Object.keys(en).filter((key) => !(key in zh)),
    identicalValueCandidates: Object.keys(en).filter((key) => en[key] === zh[key]),
    note: 'Identical values can be valid identifiers or brand names; these counts do not measure translation quality.'
  },
  staticDomains: [...domains]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([host, sourceFiles]) => ({ host, sourceFiles: [...sourceFiles].sort() })),
  directDependencies
}
const destination = resolve(root, '.forflow/evidence/source-inventory.json')
mkdirSync(resolve(root, '.forflow/evidence'), { recursive: true, mode: 0o700 })
writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  JSON.stringify(
    {
      destination,
      trackedFiles: report.trackedFiles,
      localization: {
        englishKeys: report.localization.englishKeys,
        chineseKeys: report.localization.chineseKeys,
        missing: report.localization.missingChineseKeys.length,
        identicalCandidates: report.localization.identicalValueCandidates.length
      },
      staticDomainCount: domains.size,
      directDependencyCount: directDependencies.length
    },
    null,
    2
  )
)
