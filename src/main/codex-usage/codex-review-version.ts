import { createHash } from 'node:crypto'
import type {
  CodexAnalyticsRow,
  CodexReviewSourceQuery,
  CodexReviewVersion
} from '../../shared/codex-review-types'
import type { CodexUsageAudit } from '../../shared/codex-usage-audit-types'

export type CodexReviewSource = { usage: CodexAnalyticsRow; audit: CodexUsageAudit }

export function codexReviewId(
  query: Pick<CodexReviewSourceQuery, 'sessionId' | 'scope' | 'range'>
): string {
  return createHash('sha256')
    .update(JSON.stringify(['codex-local-v1', query.sessionId, query.scope, query.range]))
    .digest('hex')
}

export function buildCodexReviewVersion(
  focus: string,
  source: CodexReviewSource
): CodexReviewVersion {
  const { updatedAt: _updatedAt, ...audit } = source.audit
  const payload = { parser: 'codex-review-v1', focus, usage: source.usage, audit }
  const id = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  return { id, createdAt: Date.now(), focus, ...structuredClone(source) }
}
