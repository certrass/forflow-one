#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
function flatten(value, prefix = '', result = {}) {
  for (const [key, child] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') {
      if (Object.hasOwn(result, name)) {
        throw new Error(`Duplicate translation path: ${name}`)
      }
      result[name] = child
    } else {
      flatten(child, name, result)
    }
  }
  return result
}
const en = flatten(read('src/renderer/src/i18n/locales/en.json'))
const zh = flatten(read('src/renderer/src/i18n/locales/zh.json'))
const allowed = read('resources/forflow/zh-technical-literals.json').entries
const variables = (text) => JSON.stringify((text.match(/\{\{[^}]+\}\}/g) ?? []).sort())
const failures = []
let technical = 0
for (const [key, value] of Object.entries(en)) {
  const translated = zh[key]
  if (translated === undefined || (value.trim() && !translated.trim())) {
    failures.push(`Missing: ${key}`)
  } else if (variables(value) !== variables(translated)) {
    failures.push(`Interpolation mismatch: ${key}`)
  } else if (
    value === translated &&
    /[a-zA-Z]/.test(value.replace(/\{\{[^}]+\}\}/g, '')) &&
    !/\p{Script=Han}/u.test(value)
  ) {
    if (allowed[key] !== value) {
      failures.push(`Untranslated UI or unreviewed literal: ${key}`)
    } else {
      technical += 1
    }
  }
}
console.log(
  JSON.stringify(
    {
      locale: 'zh-CN',
      englishKeys: Object.keys(en).length,
      chineseKeys: Object.keys(zh).length,
      reviewedTechnicalEntries: technical,
      failures
    },
    null,
    2
  )
)
if (failures.length) {
  process.exitCode = 1
}
