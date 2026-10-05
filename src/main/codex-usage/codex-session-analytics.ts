import type { CodexAnalyticsQuery, CodexAnalyticsRow } from '../../shared/codex-review-types'
import { getUsageRangeCutoff } from '../usage/usage-calendar-range'
import { readCodexSessionIndexTitle } from '../ai-vault/session-scanner-codex-title-index'
import type { CodexUsagePersistedState } from './types'
import { estimateCostUsd } from './codex-usage-cost-estimate'
import { getFilteredSessions } from './codex-usage-scope-filters'

export async function buildCodexAnalytics(
  state: CodexUsagePersistedState,
  query: CodexAnalyticsQuery
) {
  const cutoff = getUsageRangeCutoff(query.range)
  const filesBySession = new Map<string, typeof state.processedFiles>()
  for (const file of state.processedFiles) {
    for (const session of file.sessions) {
      const files = filesBySession.get(session.sessionId) ?? []
      files.push(file)
      filesBySession.set(session.sessionId, files)
    }
  }
  const rows: CodexAnalyticsRow[] = []
  for (const session of getFilteredSessions(state, query.scope, query.range)) {
    const files = filesBySession.get(session.sessionId) ?? []
    // A multi-session file has no per-session daily attribution in the legacy cache.
    const exact = files.length > 0 && files.every((file) => file.sessions.length === 1)
    const daily = exact
      ? files
          .flatMap((file) => file.dailyAggregates)
          .filter(
            (day) =>
              (!cutoff || day.day >= cutoff) && (query.scope === 'all' || day.worktreeId !== null)
          )
      : []
    if (exact && daily.length === 0) {
      continue
    }
    const costs = daily.map((day) => estimateCostUsd(day.model, day))
    const knownCosts = costs.filter((cost) => cost !== null)
    const firstFile = files[0]
    rows.push({
      sessionId: session.sessionId,
      title: firstFile
        ? await readCodexSessionIndexTitle(firstFile.path, null, session.sessionId)
        : null,
      projectLabels: [
        ...new Set(
          exact
            ? daily.map((day) => day.projectLabel)
            : session.locationBreakdown.map((entry) => entry.projectLabel)
        )
      ],
      models: [...new Set(daily.map((day) => day.model ?? 'Unknown'))],
      lastActiveAt: session.lastTimestamp,
      totalTokens: exact ? daily.reduce((sum, day) => sum + day.totalTokens, 0) : null,
      inputTokens: exact ? daily.reduce((sum, day) => sum + day.inputTokens, 0) : null,
      outputTokens: exact ? daily.reduce((sum, day) => sum + day.outputTokens, 0) : null,
      cachedInputTokens: exact ? daily.reduce((sum, day) => sum + day.cachedInputTokens, 0) : null,
      events: exact ? daily.reduce((sum, day) => sum + day.eventCount, 0) : null,
      estimatedCostUsd: knownCosts.length ? knownCosts.reduce((sum, cost) => sum + cost, 0) : null,
      unpricedEvents: daily.reduce(
        (sum, day, i) => sum + (costs[i] === null ? day.eventCount : 0),
        0
      ),
      sourceFiles: files.length,
      coverage: exact ? 'period' : 'unavailable'
    })
  }
  const projects = [...new Set(rows.flatMap((row) => row.projectLabels))].sort()
  const search = query.search.toLocaleLowerCase()
  const filtered = rows
    .filter(
      (row) =>
        (!query.project || row.projectLabels.includes(query.project)) &&
        (!search ||
          [row.title, row.sessionId, ...row.projectLabels, ...row.models]
            .join(' ')
            .toLocaleLowerCase()
            .includes(search))
    )
    .sort((a, b) => {
      const value =
        query.order === 'tokens'
          ? (b.totalTokens ?? -1) - (a.totalTokens ?? -1)
          : query.order === 'cost'
            ? (b.estimatedCostUsd ?? -1) - (a.estimatedCostUsd ?? -1)
            : 0
      return (
        value ||
        b.lastActiveAt.localeCompare(a.lastActiveAt) ||
        a.sessionId.localeCompare(b.sessionId)
      )
    })
  const page = Math.min(query.page, Math.max(1, Math.ceil(filtered.length / query.pageSize)))
  return {
    rows: filtered.slice((page - 1) * query.pageSize, page * query.pageSize),
    total: filtered.length,
    page,
    pageSize: query.pageSize,
    projects
  }
}
