import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { codexReviewSchema } from '../../shared/codex-review-types'
import type { readCodexReviewEvidence } from '../codex-usage/codex-review-evidence'
import { readJevDeliveryState } from './jev-delivery-input'
import { currentJevReview } from './jev-audit-request'

const hash = (text: string) => createHash('sha256').update(text).digest('hex')

function workspaceFixture(text = 'API_KEY=private-original-secret') {
  const versionId = 'a'.repeat(64)
  const review = codexReviewSchema.parse({
    id: 'b'.repeat(64),
    sessionId: null,
    scope: 'all',
    range: 'all',
    revision: 0,
    issues: [],
    comments: [],
    confirmations: [],
    versions: [
      {
        id: versionId,
        createdAt: 1,
        focus: '重启后保存记录仍可读取',
        usage: null,
        workspace: {
          target: {
            id: 'workspace',
            selector: 'folder:workspace',
            kind: 'folder',
            hostId: 'local',
            name: 'Private workspace',
            rootPath: '/synthetic/root',
            projectId: null,
            available: true,
            unavailableReason: null
          },
          rootIdentity: 'root-id',
          selection: { files: [{ path: 'receipt.txt', kind: 'verification' }] },
          files: [
            {
              path: 'receipt.txt',
              kind: 'verification',
              evidenceKey: 'file',
              status: 'read',
              contentHash: hash(text),
              size: text.length,
              mtimeMs: 1,
              reason: null,
              signals: []
            }
          ],
          git: { status: 'not_applicable', head: null, branch: null, changes: [], reason: null },
          ruleVersion: 'workspace-evidence-v1',
          partial: true,
          gaps: ['派生缺口不能当成失败记录']
        },
        audit: {
          scope: 'all',
          range: 'all',
          status: 'ready',
          updatedAt: 1,
          filesRead: 0,
          candidateFiles: 0,
          truncatedFiles: 0,
          failedFiles: 0,
          malformedLines: 0,
          skippedUnknownScope: 0,
          counts: { context: 0, request: 0, tool: 0, data: 0 },
          toolResults: 0,
          rows: [],
          sources: []
        }
      }
    ]
  })
  const read = vi.fn(async () => ({
    text,
    truncated: false,
    sourcePath: 'receipt.txt',
    byteOffset: 0
  }))
  return { review, version: review.versions[0], read }
}

describe('delivery source assembly', () => {
  it('keeps files as artifacts, excludes derived gaps and local paths, and binds the original bytes despite equal redacted text', async () => {
    const first = workspaceFixture()
    const second = workspaceFixture('API_KEY=changed-original-secret')
    const before = await readJevDeliveryState(
      first.review,
      first.version,
      ['file'],
      ['file'],
      first.read
    )
    const after = await readJevDeliveryState(
      second.review,
      second.version,
      ['file'],
      ['file'],
      second.read
    )
    expect(before.state.sources).toEqual(after.state.sources)
    expect(before.sourceFingerprints).not.toEqual(after.sourceFingerprints)
    expect(before.state.sources[0].role).toBe('artifact')
    expect(JSON.stringify(before.state)).not.toMatch(
      /synthetic\/root|private-original-secret|派生缺口/
    )
    expect(before.state.handoff).toEqual({ sourceIds: ['S1'] })
  })

  it('suppresses the entire confidential source and exposes its missing coverage without sending its body', async () => {
    const f = workspaceFixture('密级：机密\n完整测试显示保存成功。\n手机号 13912345678')
    const result = await readJevDeliveryState(f.review, f.version, ['file'], [], f.read)
    expect(result.state.sources[0].omitted).toBe(true)
    expect(result.state.coverage.omitted).toBe(true)
    expect(JSON.stringify(result.state)).not.toMatch(/保存成功|13912345678/)
  })

  it('rejects an unavailable original fingerprint instead of treating redacted text as provenance', async () => {
    const f = workspaceFixture()
    f.version.workspace!.files[0].contentHash = null
    await expect(readJevDeliveryState(f.review, f.version, ['file'], [], f.read)).rejects.toThrow(
      '原文指纹'
    )
  })

  it('refuses remote workspace requests in the main process and permits local folder evidence with usage disabled', () => {
    const f = workspaceFixture()
    const input = {
      mode: 'delivery' as const,
      reviewId: f.review.id,
      versionId: f.version.id,
      evidenceKeys: ['file'],
      handoffEvidenceKeys: []
    }
    expect(currentJevReview({ get: () => f.review }, input, () => false).version).toBe(f.version)
    f.version.workspace!.target.hostId = 'ssh:other'
    expect(() => currentJevReview({ get: () => f.review }, input, () => true)).toThrow('远端工作区')
    expect(f.read).not.toHaveBeenCalled()
  })

  it('keeps compacted text as derived summary and carries truncation into coverage', async () => {
    const f = workspaceFixture()
    f.version.audit.sources = [
      { path: '/synthetic/log', start: 0, end: 12, size: 12, sha256: hash('original') }
    ]
    f.version.audit.rows = [
      {
        kind: 'context',
        timestamp: '2026-09-22',
        sourcePath: '/synthetic/log',
        byteOffset: 0,
        sessionId: 'session',
        name: 'compaction',
        recordId: null,
        tokens: null,
        hasResult: null,
        recordFormat: 'compaction',
        evidenceKey: 'summary'
      }
    ]
    f.read.mockResolvedValue({
      text: '这是派生摘要，声称完成。',
      truncated: true,
      sourcePath: '/synthetic/log',
      byteOffset: 0
    })
    const result = await readJevDeliveryState(f.review, f.version, ['summary'], [], f.read)
    expect(result.state.sources[0]).toMatchObject({ role: 'derived_summary', truncated: true })
    expect(result.state.coverage.truncated).toBe(true)
  })

  it('includes the verified paired result when the selected tool record supplies handoff instructions', async () => {
    const f = workspaceFixture()
    f.version.audit.sources = [
      { path: '/synthetic/log', start: 0, end: 100, size: 100, sha256: hash('call and result') }
    ]
    f.version.audit.rows = [
      {
        kind: 'tool',
        timestamp: '2026-09-22',
        sourcePath: '/synthetic/log',
        byteOffset: 0,
        sessionId: 'session',
        name: 'read_file',
        recordId: 'read-handoff',
        tokens: null,
        hasResult: true,
        evidenceKey: 'instructions',
        resultSource: {
          sourcePath: '/synthetic/log',
          byteOffset: 30,
          contentHash: hash('instructions')
        }
      }
    ]
    const read = vi.fn<typeof readCodexReviewEvidence>(async (_review, _version, _key, part) => ({
      text:
        part === 'result'
          ? '前置：已保存记录；步骤：重启应用，打开记录；预期：原记录可读取。'
          : 'read_file README.md',
      truncated: false,
      sourcePath: '/synthetic/log',
      byteOffset: part === 'result' ? 30 : 0
    }))
    const selected = await readJevDeliveryState(
      f.review,
      f.version,
      ['instructions'],
      ['instructions'],
      read
    )
    expect(selected.state.handoff.sourceIds).toEqual(['S1', 'S1-result'])
    expect(selected.state.sources.find((source) => source.id === 'S1-result')).toMatchObject({
      role: 'execution_result',
      text: expect.stringContaining('前置：已保存记录')
    })
    expect(read).toHaveBeenCalledWith(f.review, f.version.id, 'instructions', 'result')
    const unselected = await readJevDeliveryState(f.review, f.version, ['instructions'], [], read)
    expect(unselected.state.handoff.sourceIds).toEqual([])
    expect(unselected.state.sources).toEqual(selected.state.sources)
  })
})
