import { createHash } from 'node:crypto'
import { codexEvidenceKey, type CodexReview } from '../../shared/codex-review-types'
import type { readCodexReviewEvidence } from '../codex-usage/codex-review-evidence'
import { redactWorkspaceText } from '../review/workspace-sensitive-signals'

type Version = CodexReview['versions'][number]
type Row = Version['audit']['rows'][number]
export type DeliverySource = {
  id: string
  role:
    | 'user_input'
    | 'assistant_claim'
    | 'tool_call'
    | 'execution_result'
    | 'artifact'
    | 'derived_summary'
  text: string
  truncated: boolean
  omitted: boolean
}

export function jevEvidenceFingerprint(version: Version, evidenceKey: string): string {
  const file = version.workspace?.files.find((entry) => entry.evidenceKey === evidenceKey)
  if (file) {
    if (file.status !== 'read' || !file.contentHash) {
      throw new Error('此版本没有可核验的原文指纹，请重新读取。')
    }
    return digest([
      evidenceKey,
      file.path,
      file.kind,
      file.contentHash,
      version.workspace?.rootIdentity,
      version.workspace?.target.id,
      version.workspace?.target.hostId
    ])
  }
  const row = version.audit.rows.find((entry) => codexEvidenceKey(entry) === evidenceKey)
  const source = version.audit.sources?.find((entry) => entry.path === row?.sourcePath)
  const result = row?.resultSource
  const resultFile =
    result && version.audit.sources?.find((entry) => entry.path === result.sourcePath)
  if (!row || !source?.sha256 || (result && !resultFile?.sha256)) {
    throw new Error('此版本没有可核验的原文指纹，请重新读取。')
  }
  return digest([evidenceKey, row, source, resultFile ?? null])
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function roleOf(row: Row | undefined): DeliverySource['role'] {
  if (row?.recordFormat === 'compaction') {
    return 'derived_summary'
  }
  if (row?.messageRole === 'assistant') {
    return 'assistant_claim'
  }
  if (row?.messageRole === 'user') {
    return 'user_input'
  }
  return row?.kind === 'tool' ? 'tool_call' : 'artifact'
}

function redactSource(
  id: string,
  role: DeliverySource['role'],
  record: Awaited<ReturnType<typeof readCodexReviewEvidence>>
): DeliverySource {
  const text = redactWorkspaceText(record.text)
  return {
    id,
    role,
    text,
    truncated: record.truncated,
    omitted: text === '[Confidential document omitted from review preview and external requests]'
  }
}

export async function readJevDeliveryState(
  review: CodexReview,
  version: Version,
  evidenceKeys: string[],
  handoffEvidenceKeys: string[],
  readEvidence: typeof readCodexReviewEvidence
) {
  const sources: DeliverySource[] = []
  const sourceFingerprints: { evidenceKey: string; sha256: string }[] = []
  const handoffIds: string[] = []
  for (const [index, key] of evidenceKeys.entries()) {
    const row = version.audit.rows.find((entry) => codexEvidenceKey(entry) === key)
    if (row?.recordFormat === 'response_message' && !row.messageTextChars) {
      throw new Error('此消息没有可读取的文字正文，暂不能审阅图片或摘要块。')
    }
    const id = `S${index + 1}`
    const record = await readEvidence(review, version.id, key)
    sources.push(redactSource(id, roleOf(row), record))
    if (handoffEvidenceKeys.includes(key)) {
      handoffIds.push(id)
    }
    if (row?.resultSource) {
      const result = await readEvidence(review, version.id, key, 'result')
      sources.push(redactSource(`${id}-result`, 'execution_result', result))
      if (handoffEvidenceKeys.includes(key)) {
        handoffIds.push(`${id}-result`)
      }
    }
    sourceFingerprints.push({ evidenceKey: key, sha256: jevEvidenceFingerprint(version, key) })
  }
  const criterion = redactWorkspaceText(version.focus)
  return {
    sourceFingerprints,
    state: {
      object: {
        kind: version.workspace ? 'workspace' : 'conversation',
        id: 'selected-object',
        version: version.id
      },
      goal: criterion,
      targetCriterion: { id: 'R1', text: criterion },
      sources,
      handoff: { sourceIds: handoffIds },
      coverage: {
        selection: 'explicit',
        wholeProject: false,
        partial: true,
        truncated: sources.some((source) => source.truncated),
        omitted: sources.some((source) => source.omitted)
      }
    }
  }
}
