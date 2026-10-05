import { createHash } from 'node:crypto'
import type {
  CodexAnalyticsRow,
  CodexReviewSourceQuery,
  CodexReviewVersion
} from '../../shared/codex-review-types'
import type { CodexUsageAudit } from '../../shared/codex-usage-audit-types'

import type {
  WorkspaceReviewQuery,
  WorkspaceReviewSnapshot
} from '../../shared/workspace-review-types'

export type ReviewSourceQuery = CodexReviewSourceQuery | WorkspaceReviewQuery
export type CodexReviewSource = {
  usage: CodexAnalyticsRow | null
  audit: CodexUsageAudit
  workspace?: WorkspaceReviewSnapshot
}

export function codexReviewId(
  query: Pick<CodexReviewSourceQuery, 'sessionId' | 'scope' | 'range'> | WorkspaceReviewQuery
): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        'workspaceId' in query
          ? ['workspace-review-v1', query.workspaceId]
          : ['codex-local-v1', query.sessionId, query.scope, query.range]
      )
    )
    .digest('hex')
}

export function buildCodexReviewVersion(
  focus: string,
  source: CodexReviewSource
): CodexReviewVersion {
  const { updatedAt: _updatedAt, ...audit } = source.audit
  const payload = {
    parser: 'codex-review-v1',
    focus,
    usage: source.usage,
    audit,
    ...(source.workspace ? { workspace: source.workspace } : {})
  }
  const id = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  return { id, createdAt: Date.now(), focus, ...structuredClone(source) }
}
