import type { CodexReview } from '../../../../shared/codex-review-types'
import type { JevReceipt } from '../../../../shared/jev-audit-types'

export const review: CodexReview = {
  id: 'a'.repeat(64),
  sessionId: 'session',
  scope: 'all',
  range: 'all',
  revision: 0,
  issues: [],
  comments: [],
  confirmations: [],
  versions: [
    {
      id: 'b'.repeat(64),
      createdAt: 1,
      focus: 'Did it complete?',
      usage: {
        sessionId: 'session',
        title: 'Fixture',
        projectLabels: [],
        models: [],
        lastActiveAt: '',
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        events: 1,
        estimatedCostUsd: null,
        unpricedEvents: 1,
        sourceFiles: 1,
        coverage: 'period'
      },
      audit: {
        scope: 'all',
        range: 'all',
        status: 'ready',
        updatedAt: 1,
        filesRead: 1,
        candidateFiles: 1,
        truncatedFiles: 0,
        failedFiles: 0,
        malformedLines: 0,
        skippedUnknownScope: 0,
        counts: { context: 0, request: 0, tool: 1, data: 0 },
        toolResults: 0,
        rows: [
          {
            kind: 'tool',
            timestamp: '2026-09-21T00:00:00Z',
            sourcePath: '/synthetic',
            byteOffset: 0,
            sessionId: 'session',
            name: 'exec',
            recordId: 'call',
            tokens: null,
            hasResult: false,
            evidenceKey: 'evidence'
          }
        ]
      }
    }
  ]
}
export const receipt: JevReceipt = {
  id: '0cd229ec-369c-4634-bbe7-b0a9e2c9a1b3',
  reviewId: review.id,
  versionId: review.versions[0].id,
  evidenceKey: 'evidence',
  inputHash: 'c'.repeat(64),
  questionVersion: 'forflow-review-v1',
  requestedModel: 'jev-1.13.0',
  createdAt: 1,
  completedAt: 2,
  status: 'completed',
  error: null,
  result: {
    model: 'jev-1.13.0',
    usage: { input_tokens: 100, output_tokens: 0 },
    answers: {
      evidence: {
        type: 'choice',
        choice: 'missing',
        confidence: 1,
        probabilities: { sufficient: 0, missing: 1, unknown: 0 }
      }
    }
  }
}
