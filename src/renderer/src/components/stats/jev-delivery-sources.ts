import { codexEvidenceKey, type CodexReviewVersion } from '../../../../shared/codex-review-types'

export function jevDeliverySources(version: CodexReviewVersion) {
  const files = (version.workspace?.files ?? [])
    .filter((file) => file.status === 'read')
    .map((file) => ({ key: file.evidenceKey, label: file.path, location: file.path }))
  const rows = version.audit.rows.map((row) => ({
    key: codexEvidenceKey(row),
    label: `${row.name} · ${row.recordId ?? row.timestamp}`,
    location: `${row.sourcePath} · ${row.byteOffset}`
  }))
  return [...new Map([...files, ...rows].map((source) => [source.key, source])).values()]
}
