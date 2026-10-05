import { codexOpenCodeTokenSessions } from '../usage/agent-token-usage'
import { app } from 'electron'
import type { CodexUsageAudit } from '../../shared/codex-usage-audit-types'
import { readCodexUsageAudit } from './codex-usage-audit'
import { createUsageWorktreeResolver } from '../usage/usage-worktree-resolver'
import { createWorktreeRefs } from '../usage/usage-worktree-refs'
import { loadKnownUsageWorktreesByRepo } from '../usage-worktree-metadata'
import { join } from 'node:path'
import type {
  CodexUsageBreakdownKind,
  CodexUsageBreakdownRow,
  CodexUsageDailyPoint,
  CodexUsageRange,
  CodexUsageScope,
  CodexUsageSessionRow,
  CodexUsageSnapshot,
  CodexUsageSummary
} from '../../shared/codex-usage-types'
import type { AutomationRunUsage } from '../../shared/automations-types'
import type { Store } from '../persistence'
import type { CodexUsagePersistedState } from './types'
import type { AutomationUsageLookupInput } from './codex-automation-run-attribution'
import { CODEX_USAGE_SCHEMA_VERSION, codexUsageProvider } from './codex-usage-provider'
import { resolveCodexAutomationRunUsage } from './codex-automation-run-attribution'
import { buildRecentSessions } from './codex-usage-session-rows'
import { buildBreakdown, buildDaily, buildSummary } from './codex-usage-rollup-projections'
import { UsageProviderStoreLifecycle } from '../usage/usage-provider-store-lifecycle'
import { buildCodexAnalytics } from './codex-session-analytics'
import type { CodexAnalyticsQuery, CodexReviewSourceQuery } from '../../shared/codex-review-types'

const SCHEMA_VERSION = CODEX_USAGE_SCHEMA_VERSION

let _codexUsageFile: string | null = null

function getDefaultState(): CodexUsagePersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    worktreeFingerprint: null,
    processedFiles: [],
    sessions: [],
    dailyAggregates: [],
    scanState: {
      enabled: false,
      lastScanStartedAt: null,
      lastScanCompletedAt: null,
      lastScanError: null
    }
  }
}

export function normalizePersistedState(state: CodexUsagePersistedState): CodexUsagePersistedState {
  if (state.schemaVersion !== SCHEMA_VERSION) {
    // Why: Orca-scoped Codex projections now depend on locationModelBreakdown.
    // Reusing an older cache would silently serve wrong model/session rows
    // until the next forced rescan, so schema changes must invalidate stale
    // persisted analytics instead of best-effort patching partial data.
    // Preserve scanState.enabled so existing users keep tracking on across
    // schema bumps; the next refresh will repopulate the analytics.
    const defaults = getDefaultState()
    return {
      ...defaults,
      scanState: {
        ...defaults.scanState,
        enabled: state.scanState?.enabled ?? defaults.scanState.enabled
      }
    }
  }
  return {
    ...state,
    sessions: state.sessions.map((session) => ({
      ...session,
      locationModelBreakdown: session.locationModelBreakdown ?? []
    }))
  }
}

export function initCodexUsagePath(): void {
  _codexUsageFile = join(app.getPath('userData'), 'orca-codex-usage.json')
}

function getCodexUsageFile(): string {
  if (!_codexUsageFile) {
    _codexUsageFile = join(app.getPath('userData'), 'orca-codex-usage.json')
  }
  return _codexUsageFile
}

export class CodexUsageStore extends UsageProviderStoreLifecycle<
  'processedFiles',
  CodexUsagePersistedState,
  'hasAnyCodexData'
> {
  private auditCache: { key: string; expiresAt: number; value: Promise<CodexUsageAudit> } | null =
    null

  constructor(private readonly auditStore: Pick<Store, 'getRepos' | 'getAllWorktreeMeta'>) {
    super(auditStore, {
      tokenUsage: {
        provider: 'codex',
        selectSessions: (state) => codexOpenCodeTokenSessions(state.sessions)
      },
      logTag: '[codex-usage]',
      resolveCacheFile: getCodexUsageFile,
      createDefaultState: getDefaultState,
      normalizeState: normalizePersistedState,
      sourceKey: 'processedFiles',
      dataPresenceKey: 'hasAnyCodexData',
      scan: codexUsageProvider.scan
    })
  }

  getAudit(scope: CodexUsageScope, range: CodexUsageRange): Promise<CodexUsageAudit> {
    const key = JSON.stringify([scope, range, this.state.scanState, this.state.worktreeFingerprint])
    if (this.auditCache?.key === key && this.auditCache.expiresAt > Date.now()) {
      return this.auditCache.value
    }
    const repos = this.auditStore.getRepos()
    const refs = createWorktreeRefs(repos, loadKnownUsageWorktreesByRepo(this.auditStore, repos))
    const state = this.state
    const value = createUsageWorktreeResolver(refs).then((resolver) =>
      readCodexUsageAudit(state, scope, range, resolver)
    )
    this.auditCache = { key, expiresAt: Date.now() + 30_000, value }
    return value
  }

  getSnapshot(
    scope: CodexUsageScope,
    range: CodexUsageRange,
    recentSessionLimit = 10
  ): CodexUsageSnapshot {
    return {
      scanState: this.getScanState(),
      summary: buildSummary(this.state, scope, range),
      daily: buildDaily(this.state, scope, range),
      modelBreakdown: buildBreakdown(this.state, scope, range, 'model'),
      projectBreakdown: buildBreakdown(this.state, scope, range, 'project'),
      recentSessions: buildRecentSessions(this.state, scope, range, recentSessionLimit)
    }
  }

  async getSummary(scope: CodexUsageScope, range: CodexUsageRange): Promise<CodexUsageSummary> {
    await this.refresh(false)
    return buildSummary(this.state, scope, range)
  }

  async getDaily(scope: CodexUsageScope, range: CodexUsageRange): Promise<CodexUsageDailyPoint[]> {
    await this.refresh(false)
    return buildDaily(this.state, scope, range)
  }

  async getBreakdown(
    scope: CodexUsageScope,
    range: CodexUsageRange,
    kind: CodexUsageBreakdownKind
  ): Promise<CodexUsageBreakdownRow[]> {
    await this.refresh(false)
    return buildBreakdown(this.state, scope, range, kind)
  }

  async getRecentSessions(
    scope: CodexUsageScope,
    range: CodexUsageRange,
    limit = 12
  ): Promise<CodexUsageSessionRow[]> {
    await this.refresh(false)
    return buildRecentSessions(this.state, scope, range, limit)
  }

  async getAutomationRunUsage(input: AutomationUsageLookupInput): Promise<AutomationRunUsage> {
    return resolveCodexAutomationRunUsage(input, {
      getState: () => this.state,
      refresh: (force) => this.refresh(force),
      isScanning: () => this.getScanState().isScanning
    })
  }

  async getAnalytics(query: CodexAnalyticsQuery) {
    await this.refresh(false)
    if (!this.state.scanState.enabled) {
      return { rows: [], total: 0, page: 1, pageSize: query.pageSize, projects: [] }
    }
    return buildCodexAnalytics(this.state, query)
  }

  async getReviewSource(query: CodexReviewSourceQuery) {
    if (!this.state.scanState.enabled) {
      throw new Error('请先启用 Codex 使用情况读取')
    }
    const scan = await this.refresh(true)
    if (scan.lastScanError) {
      throw new Error('无法刷新当前用量索引，请重试后再审阅')
    }
    const session = this.state.sessions.find((entry) => entry.sessionId === query.sessionId)
    if (!session) {
      throw new Error('会话已不在当前索引中，请刷新使用记录')
    }
    const analytics = await buildCodexAnalytics(
      { ...this.state, sessions: [session] },
      {
        ...query,
        search: '',
        project: '',
        order: 'recent',
        page: 1,
        pageSize: 1
      }
    )
    const usage = analytics.rows[0]
    if (!usage) {
      throw new Error('当前期间或工作区范围中没有此会话')
    }
    const repos = this.auditStore.getRepos()
    const refs = createWorktreeRefs(repos, loadKnownUsageWorktreesByRepo(this.auditStore, repos))
    const resolver = await createUsageWorktreeResolver(refs)
    const audit = await readCodexUsageAudit(this.state, query.scope, query.range, resolver, {
      sessionId: query.sessionId,
      rowLimit: 200
    })
    return { usage, audit }
  }
}
