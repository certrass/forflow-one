import { codexEvidenceKey, type CodexReviewVersion } from './codex-review-types'

export function codexReviewRowSignature(row: CodexReviewVersion['audit']['rows'][number]): string {
  return JSON.stringify([
    row.kind,
    row.name,
    row.tokens,
    row.hasResult,
    row.contentHash,
    row.resultSource?.contentHash
  ])
}

export function compareCodexReviewVersions(
  previous: CodexReviewVersion,
  current: CodexReviewVersion
) {
  const before = new Map(
    previous.audit.rows.map((row) => [codexEvidenceKey(row), codexReviewRowSignature(row)])
  )
  const after = new Map(
    current.audit.rows.map((row) => [codexEvidenceKey(row), codexReviewRowSignature(row)])
  )
  return {
    added: [...after.keys()].filter((key) => !before.has(key)),
    removed: [...before.keys()].filter((key) => !after.has(key)),
    changed: [...after.keys()].filter(
      (key) => before.has(key) && before.get(key) !== after.get(key)
    ),
    unchanged: [...after.keys()].filter((key) => before.get(key) === after.get(key))
  }
}
