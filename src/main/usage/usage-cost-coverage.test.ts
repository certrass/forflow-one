import { describe, expect, it } from 'vitest'
import { buildSummary as codexSummary } from '../codex-usage/codex-usage-rollup-projections'
import { buildSummary as claudeSummary } from '../claude-usage/claude-usage-report-aggregation'
import { buildOpenCodeUsageSummary } from '../opencode-usage/snapshot-rollups'
import type { CodexUsagePersistedState } from '../codex-usage/types'
import type { ClaudeUsagePersistedState } from '../claude-usage/types'

const baseState = {
  schemaVersion: 1,
  worktreeFingerprint: null,
  processedFiles: [],
  sessions: [],
  scanState: {
    enabled: true,
    lastScanStartedAt: null,
    lastScanCompletedAt: null,
    lastScanError: null
  }
}
const codexRow = {
  day: '2026-09-20',
  model: 'gpt-5',
  projectKey: 'folder:test',
  projectLabel: 'Folder',
  repoId: null,
  worktreeId: 'folder:test',
  eventCount: 2,
  inputTokens: 1000,
  cachedInputTokens: 400,
  outputTokens: 250,
  reasoningOutputTokens: 100,
  totalTokens: 1250,
  hasInferredPricing: false
}
const claudeRow = {
  day: '2026-09-20',
  model: 'claude-sonnet-4-6',
  projectKey: 'folder:test',
  projectLabel: 'Folder',
  repoId: null,
  worktreeId: 'folder:test',
  turnCount: 2,
  zeroCacheReadTurnCount: 0,
  inputTokens: 1000,
  outputTokens: 500,
  cacheReadTokens: 200,
  cacheWriteTokens: 100,
  cacheWrite1hTokens: 0
}

describe('usage cost coverage at the existing projection boundary', () => {
  it('keeps unknown Codex prices visible alongside a known subtotal and respects workspace scope', () => {
    const state: CodexUsagePersistedState = {
      ...baseState,
      dailyAggregates: [
        codexRow,
        { ...codexRow, model: 'unpriced-private-model', eventCount: 3 },
        { ...codexRow, model: null, eventCount: 4, worktreeId: null }
      ]
    }
    const local = codexSummary(state, 'orca', 'all')
    expect(local.events).toBe(5)
    expect(local.estimatedCostUsd).toBeGreaterThan(0)
    expect(local.costCoverage).toEqual({
      pricedRecords: 2,
      unpricedRecords: 3,
      unclassifiedRecords: 0
    })
    expect(codexSummary(state, 'all', 'all').costCoverage?.unpricedRecords).toBe(7)
  })
  it('counts Claude turns separately and does not treat an unknown model as free', () => {
    const state: ClaudeUsagePersistedState = {
      ...baseState,
      dailyAggregates: [claudeRow, { ...claudeRow, model: 'unpriced-private-model', turnCount: 5 }]
    }
    expect(claudeSummary(state, 'all', 'all').costCoverage).toEqual({
      pricedRecords: 2,
      unpricedRecords: 5,
      unclassifiedRecords: 0
    })
    state.dailyAggregates = [{ ...claudeRow, model: null }]
    expect(claudeSummary(state, 'all', 'all').estimatedCostUsd).toBeNull()
    expect(claudeSummary(state, 'all', 'all').costCoverage?.unpricedRecords).toBe(2)
  })
  it('does not infer complete event pricing from an OpenCode daily subtotal', () => {
    const summary = buildOpenCodeUsageSummary(
      'all',
      'all',
      [
        { ...codexRow, estimatedCostUsd: 0.5 },
        { ...codexRow, eventCount: 3, estimatedCostUsd: null }
      ],
      []
    )
    expect(summary.estimatedCostUsd).toBe(0.5)
    expect(summary.costCoverage).toEqual({
      pricedRecords: 0,
      unpricedRecords: 3,
      unclassifiedRecords: 2
    })
  })
  it('returns no amount and no observed records for an empty range', () => {
    const state: CodexUsagePersistedState = {
      ...baseState,
      dailyAggregates: [{ ...codexRow, day: '2001-01-01' }]
    }
    const summary = codexSummary(state, 'all', '7d')
    expect(summary.estimatedCostUsd).toBeNull()
    expect(summary.costCoverage).toEqual({
      pricedRecords: 0,
      unpricedRecords: 0,
      unclassifiedRecords: 0
    })
  })
})
