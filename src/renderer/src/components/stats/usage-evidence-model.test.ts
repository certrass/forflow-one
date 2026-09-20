import { describe, expect, it } from 'vitest'
import { buildUsageEvidence } from './usage-evidence-model'
import { buildUsageOverview } from './usage-overview-model'
import type { UsageOverviewInput } from './usage-overview-types'

function evidenceFixture(): UsageOverviewInput {
  return {
    claude: { scanState: null, summary: null, daily: [] },
    opencode: { scanState: null, summary: null, daily: [] },
    codex: {
      scanState: {
        enabled: true,
        isScanning: false,
        lastScanStartedAt: 1,
        lastScanCompletedAt: 2,
        lastScanError: null,
        hasAnyCodexData: true
      },
      summary: {
        scope: 'all',
        range: '7d',
        sessions: 1,
        events: 5,
        inputTokens: 100,
        cachedInputTokens: 20,
        outputTokens: 50,
        reasoningOutputTokens: 10,
        totalTokens: 150,
        estimatedCostUsd: 0.05,
        costCoverage: { pricedRecords: 2, unpricedRecords: 3, unclassifiedRecords: 0 },
        topModel: 'test',
        topProject: 'folder',
        hasAnyCodexData: true
      },
      daily: []
    }
  }
}

describe('usage evidence view model', () => {
  it('shows a partial cost within a single source and preserves its actual filter scope', () => {
    const input = evidenceFixture()
    const model = buildUsageEvidence(input, 'codex')
    expect(model.estimatedCostUsd).toBe(0.05)
    expect(model.unpricedRecords).toBe(3)
    expect(model.sources[0]).toMatchObject({
      scope: '当前主机全部日志',
      range: '最近 7 天',
      observedRecords: 5
    })
    expect(buildUsageOverview(input).hasPartialCost).toBe(true)
  })
  it('treats absent legacy metadata and inconsistent counts as unknown', () => {
    const input = evidenceFixture()
    const summary = input.codex.summary!
    delete summary.costCoverage
    expect(buildUsageEvidence(input, 'codex').unclassifiedRecords).toBe(5)
    summary.costCoverage = { pricedRecords: 0, unpricedRecords: 0, unclassifiedRecords: 0 }
    expect(buildUsageEvidence(input, 'codex').unclassifiedRecords).toBe(5)
  })
  it('retains a legitimate zero estimate without using zero for missing data', () => {
    const input = evidenceFixture()
    input.codex.summary!.estimatedCostUsd = 0
    expect(buildUsageEvidence(input, 'codex').estimatedCostUsd).toBe(0)
    input.codex.summary!.estimatedCostUsd = null
    expect(buildUsageEvidence(input, 'codex').estimatedCostUsd).toBeNull()
  })
  it('does not reuse Codex evidence for disabled sources or Grok quota', () => {
    const input = evidenceFixture()
    expect(buildUsageEvidence(input, 'grok')).toMatchObject({
      sources: [],
      observedRecords: 0,
      estimatedCostUsd: null
    })
    input.codex.scanState!.enabled = false
    expect(buildUsageEvidence(input, 'codex')).toMatchObject({
      observedRecords: 0,
      estimatedCostUsd: null,
      modelCoverage: '暂无可核验记录'
    })
  })
  it('marks failed scans as stale and does not treat startup as a completed observation', () => {
    const input = evidenceFixture()
    input.codex.scanState!.lastScanError = 'denied'
    expect(buildUsageEvidence(input, 'codex').hasReadError).toBe(true)
    expect(buildUsageEvidence(input, 'codex').sources[0].stateLabel).toContain('上次快照')
    input.codex.scanState!.lastScanCompletedAt = null
    expect(buildUsageEvidence(input, 'codex').observedRecords).toBe(0)
  })
  it('rejects non-finite and negative amounts and malformed coverage', () => {
    const input = evidenceFixture()
    input.codex.summary!.estimatedCostUsd = Number.NaN
    input.codex.summary!.costCoverage = {
      pricedRecords: -1,
      unpricedRecords: 6,
      unclassifiedRecords: 0
    }
    expect(buildUsageEvidence(input, 'codex')).toMatchObject({
      estimatedCostUsd: null,
      unclassifiedRecords: 5
    })
  })
})
