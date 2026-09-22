import type {
  WorkspaceReviewDirectory,
  WorkspaceReviewDirectoryQuery,
  WorkspaceReviewQuery,
  WorkspaceReviewTarget
} from '../../shared/workspace-review-types'
import type { ClaudeUsageBreakdownKind, ClaudeUsageSnapshot } from '../../shared/claude-usage-types'
import type { CodexUsageBreakdownKind, CodexUsageSnapshot } from '../../shared/codex-usage-types'
import type { CodexUsageAudit } from '../../shared/codex-usage-audit-types'
import type {
  CodexAnalyticsQuery,
  CodexAnalyticsResult,
  CodexReview,
  CodexReviewSourceQuery,
  CodexReviewMutation
} from '../../shared/codex-review-types'
import type {
  OpenCodeUsageBreakdownKind,
  OpenCodeUsageSnapshot
} from '../../shared/opencode-usage-types'
import type {
  CodexRateLimitResetResult,
  RateLimitRuntimeTarget,
  RateLimitState
} from '../../shared/rate-limit-types'

export type UsageProviderSnapshot = {
  scanState: unknown
  summary: { scope: string; range: string }
  daily: unknown[]
  modelBreakdown: unknown[]
  recentSessions: unknown[]
}

export type UsageQueryArgs<Snapshot extends UsageProviderSnapshot> = Pick<
  Snapshot['summary'],
  'scope' | 'range'
>

export type UsageProviderApi<Snapshot extends UsageProviderSnapshot, BreakdownKind> = {
  getScanState: () => Promise<Snapshot['scanState']>
  setEnabled: (args: { enabled: boolean }) => Promise<Snapshot['scanState']>
  refresh: (args?: { force?: boolean }) => Promise<Snapshot['scanState']>
  getSnapshot: (args: UsageQueryArgs<Snapshot> & { limit?: number }) => Promise<Snapshot>
  getSummary: (args: UsageQueryArgs<Snapshot>) => Promise<Snapshot['summary']>
  getDaily: (args: UsageQueryArgs<Snapshot>) => Promise<Snapshot['daily']>
  getBreakdown: (
    args: UsageQueryArgs<Snapshot> & { kind: BreakdownKind }
  ) => Promise<Snapshot['modelBreakdown']>
  getRecentSessions: (
    args: UsageQueryArgs<Snapshot> & { limit?: number }
  ) => Promise<Snapshot['recentSessions']>
}

export type ClaudeUsageApi = UsageProviderApi<ClaudeUsageSnapshot, ClaudeUsageBreakdownKind>

export type CodexUsageApi = UsageProviderApi<CodexUsageSnapshot, CodexUsageBreakdownKind> & {
  listWorkspaceReviewTargets?: () => Promise<WorkspaceReviewTarget[]>
  listWorkspaceReviewFiles?: (
    args: WorkspaceReviewDirectoryQuery
  ) => Promise<WorkspaceReviewDirectory>
  listWorkspaceReviews?: () => Promise<CodexReview[]>
  openWorkspaceReview?: (args: WorkspaceReviewQuery) => Promise<CodexReview>
  getAudit?: (args: UsageQueryArgs<CodexUsageSnapshot>) => Promise<CodexUsageAudit>
  getAnalytics?: (args: CodexAnalyticsQuery) => Promise<CodexAnalyticsResult>
  openReview?: (args: CodexReviewSourceQuery) => Promise<CodexReview>
  getReview?: (id: string) => Promise<CodexReview>
  updateReview?: (args: CodexReviewMutation) => Promise<CodexReview>
  readReviewEvidence?: (args: {
    id: string
    versionId: string
    evidenceKey: string
    part?: 'record' | 'result'
  }) => Promise<{ text: string; truncated: boolean; sourcePath: string; byteOffset: number }>
}

export type OpenCodeUsageApi = UsageProviderApi<OpenCodeUsageSnapshot, OpenCodeUsageBreakdownKind>

export type RateLimitsApi = {
  get: () => Promise<RateLimitState>
  refresh: () => Promise<RateLimitState>
  refreshCodexForTarget: (target: RateLimitRuntimeTarget) => Promise<RateLimitState>
  consumeCodexResetCredit: () => Promise<CodexRateLimitResetResult>
  refreshClaudeForTarget: (target: RateLimitRuntimeTarget) => Promise<RateLimitState>
  setPollingInterval: (ms: number) => Promise<void>
  fetchInactiveClaudeAccounts: () => Promise<void>
  fetchInactiveCodexAccounts: () => Promise<void>
  refreshMiniMax: () => Promise<RateLimitState>
  refreshGrok: () => Promise<RateLimitState>
  onUpdate: (callback: (state: RateLimitState) => void) => () => void
}
