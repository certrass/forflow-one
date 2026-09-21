import { open } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { codexEvidenceKey, type CodexReview } from '../../shared/codex-review-types'
import { readCodexAuditMessage } from './codex-audit-message'

function messageExcerpt(line: string): string {
  const parsed: unknown = JSON.parse(line)
  if (!parsed || typeof parsed !== 'object' || !('payload' in parsed)) {
    throw new Error('消息原文格式无效，请重新读取')
  }
  const payload = parsed.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('消息原文格式无效，请重新读取')
  }
  const message = readCodexAuditMessage(Object.fromEntries(Object.entries(payload)))
  if (!message) {
    throw new Error('消息原文格式无效，请重新读取')
  }
  return JSON.stringify({ type: 'message', ...message })
}

function redact(text: string): string {
  return text
    .replace(/\b(?:sk|ghp|github_pat)-?[A-Za-z0-9_-]{20,}\b/g, '[credential redacted]')
    .replace(
      /("(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|authorization)"\s*:\s*")[^"\n]+/gi,
      '$1[redacted]'
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+/gi, 'Bearer [redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email redacted]')
}

export async function readCodexReviewEvidence(
  review: CodexReview,
  versionId: string,
  evidenceKey: string,
  part: 'record' | 'result' = 'record'
) {
  const version = review.versions.find((entry) => entry.id === versionId)
  const row = version?.audit.rows.find((entry) => codexEvidenceKey(entry) === evidenceKey)
  const location = part === 'result' ? row?.resultSource : row
  const source = version?.audit.sources?.find((entry) => entry.path === location?.sourcePath)
  if (
    !location ||
    !source ||
    location.byteOffset < source.start ||
    location.byteOffset >= source.end
  ) {
    throw new Error('原始位置不属于此审阅版本')
  }
  const length = source.end - source.start
  if (length < 0 || length > 2 * 1024 * 1024) {
    throw new Error('记录范围无效')
  }
  const handle = await open(source.path, 'r')
  try {
    if (!(await handle.stat()).isFile()) {
      throw new Error('原始来源不是普通文件')
    }
    const bytes = Buffer.alloc(length)
    const read = await handle.read(bytes, 0, length, source.start)
    if (
      read.bytesRead !== length ||
      createHash('sha256').update(bytes).digest('hex') !== source.sha256
    ) {
      throw new Error('原始片段已变化，无法将新内容作为旧版本证据；请重新读取')
    }
    const offset = location.byteOffset - source.start
    const newline = bytes.indexOf(10, offset)
    const line = bytes.toString('utf8', offset, newline === -1 ? bytes.length : newline)
    const text = redact(
      part === 'record' && row?.recordFormat === 'response_message' ? messageExcerpt(line) : line
    )
    return {
      text: text.slice(0, 16000),
      truncated: text.length > 16000,
      sourcePath: source.path,
      byteOffset: location.byteOffset
    }
  } finally {
    await handle.close()
  }
}
