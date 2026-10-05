import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { CodexReview } from '../../shared/codex-review-types'
import { redactJevText } from '../forflow/jev-audit-input'
import { readCodexReviewEvidence } from './codex-review-evidence'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function evidence(payload: unknown) {
  const directory = await mkdtemp(join(tmpdir(), 'codex-evidence-redaction-'))
  directories.push(directory)
  const path = join(directory, 'rollout.jsonl')
  const timestamp = new Date().toISOString()
  const line = JSON.stringify({ timestamp, type: 'response_item', payload })
  const bytes = Buffer.from(`${line}\n`)
  await writeFile(path, bytes)
  const review: CodexReview = {
    id: 'review',
    sessionId: 'session',
    scope: 'all',
    range: 'all',
    revision: 0,
    issues: [],
    comments: [],
    confirmations: [],
    versions: [
      {
        id: 'version',
        createdAt: Date.now(),
        focus: 'Inspect selected evidence',
        usage: null,
        audit: {
          scope: 'all',
          range: 'all',
          status: 'ready',
          updatedAt: Date.now(),
          filesRead: 1,
          candidateFiles: 1,
          truncatedFiles: 0,
          failedFiles: 0,
          malformedLines: 0,
          skippedUnknownScope: 0,
          counts: { context: 0, request: 0, tool: 1, data: 0 },
          toolResults: 0,
          sources: [
            {
              path,
              start: 0,
              end: bytes.length,
              size: bytes.length,
              sha256: createHash('sha256').update(bytes).digest('hex')
            }
          ],
          rows: [
            {
              kind: 'tool',
              name: 'exec',
              recordId: 'call',
              timestamp,
              sourcePath: path,
              byteOffset: 0,
              sessionId: 'session',
              tokens: null,
              hasResult: false,
              evidenceKey: 'evidence',
              contentHash: createHash('sha256').update(line).digest('hex')
            }
          ]
        }
      }
    ]
  }
  return readCodexReviewEvidence(review, 'version', 'evidence')
}

describe('Codex evidence redaction before excerpt limits', () => {
  it('redacts nested JSON credentials before a long tool record becomes invalid truncated JSON', async () => {
    const excerpt = await evidence({
      type: 'function_call',
      call_id: 'call',
      name: 'exec',
      arguments: JSON.stringify({ API_KEY: 'synthetic-nested-secret', command: 'x'.repeat(20_000) })
    })
    expect(excerpt.truncated).toBe(true)
    expect(excerpt.text.length).toBeLessThanOrEqual(16000)
    expect(excerpt.text).not.toContain('synthetic-nested-secret')
    expect(redactJevText(excerpt.text)).not.toContain('synthetic-nested-secret')
    expect(excerpt.text).toContain('[redacted]')
  })

  it('redacts a complete escaped private key before shortening its JSON record', async () => {
    const excerpt = await evidence({
      type: 'function_call',
      call_id: 'call',
      name: 'exec',
      arguments: JSON.stringify({
        note: '-----BEGIN PRIVATE KEY-----\nsynthetic-key-material\n-----END PRIVATE KEY-----',
        command: 'x'.repeat(20_000)
      })
    })
    expect(excerpt.truncated).toBe(true)
    expect(excerpt.text).not.toContain('synthetic-key-material')
    expect(excerpt.text).toContain('[private key redacted]')
  })
})
