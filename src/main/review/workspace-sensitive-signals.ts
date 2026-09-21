import { createHash } from 'node:crypto'
import type { WorkspaceSensitiveSignal } from '../../shared/workspace-review-types'
import { CREDENTIAL_ASSIGNMENT_PATTERN, redactJevText } from '../forflow/jev-audit-input'

export const MAX_WORKSPACE_SENSITIVE_SIGNALS = 100

type SensitiveRule = {
  ruleId: string
  category: WorkspaceSensitiveSignal['category']
  pattern: RegExp
  assignment?: boolean
}

const rules: SensitiveRule[] = [
  {
    ruleId: 'private-key-block',
    category: 'credential',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g
  },
  {
    ruleId: 'credential-token-format',
    category: 'credential',
    pattern: /\b(?:sk[-_]|ghp_|github_pat_)[A-Za-z0-9_-]{16,}\b/g
  },
  {
    ruleId: 'bearer-credential',
    category: 'credential',
    pattern: /(\bBearer[ \t]+)([A-Za-z0-9._~+/-]+=*)/gi,
    assignment: true
  },
  {
    ruleId: 'credential-assignment',
    category: 'credential',
    pattern: CREDENTIAL_ASSIGNMENT_PATTERN,
    assignment: true
  },
  {
    ruleId: 'email-address',
    category: 'personal_data',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  },
  {
    ruleId: 'cn-mobile-format',
    category: 'personal_data',
    pattern: /(?<!\d)(?:(?:\+86|0086)[ -]?)?1[3-9]\d{9}(?!\d)/g
  },
  {
    ruleId: 'cn-identity-format',
    category: 'personal_data',
    pattern:
      /(?<!\d)[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)/g
  },
  {
    ruleId: 'explicit-confidential-marker',
    category: 'confidential_marker',
    pattern:
      /^[ \t]*(?:#{1,6}[ \t]+)?(?:(?:密级|保密级别|classification)[ \t]*[:：][ \t]*(?:机密|绝密|保密|内部|confidential|restricted)|[【[](?:机密|绝密|保密|内部资料|内部保密|商业秘密|confidential)[】\]]|(?:本文件|本文档|本资料)(?:为|属于|标记为)(?:保密资料|机密资料|商业秘密)|(?:STRICTLY[ \t]+)?CONFIDENTIAL\b|(?:机密|绝密|保密|内部资料|内部保密|商业秘密)(?=[ \t]*(?:$|[，：:—-]|禁止外传)))/gim
  }
]

function isPlaceholder(raw: string): boolean {
  const value = raw.replace(/^["']|["']$/g, '').trim()
  return (
    !value ||
    /^(?:YOUR[_-](?:API[_-]?KEY|TOKEN|PASSWORD|SECRET)|<(?:示例密码|示例密钥|YOUR_API_KEY|TOKEN|PASSWORD|SECRET|REDACTED)>|\[(?:REDACTED|已脱敏)\]|\$\{[^}]+\}|\$[A-Z_][A-Z0-9_]*|process\.env\.[A-Z_][A-Z0-9_]*|null|undefined|true|false|example|placeholder|changeme|redacted|示例密码|示例密钥|已脱敏|\*+|x{3,}|\.{3})$/i.test(
      value
    )
  )
}

function sensitiveSpan(match: RegExpExecArray, rule: SensitiveRule) {
  const raw = rule.assignment ? match[2] : match[0]
  if (!raw || (rule.category === 'credential' && isPlaceholder(raw))) {
    return null
  }
  const prefixLength = rule.assignment ? (match[1]?.length ?? 0) : 0
  const quoted = rule.assignment && /^["']/.test(raw)
  const start = match.index + prefixLength + (quoted ? 1 : 0)
  return { start, end: start + raw.length - (quoted ? 2 : 0) }
}

function positionAt(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset)
  return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') }
}

// The display cap does not limit redaction; IDs identify locations, never secret values.
export function inspectWorkspaceText(
  text: string,
  evidenceKey: string
): WorkspaceSensitiveSignal[] {
  const candidates: { offset: number; signal: WorkspaceSensitiveSignal }[] = []
  for (const rule of rules) {
    const pattern = new RegExp(rule.pattern)
    let count = 0
    for (const match of text.matchAll(pattern)) {
      const span = sensitiveSpan(match, rule)
      if (!span) {
        continue
      }
      const position = positionAt(text, span.start)
      candidates.push({
        offset: span.start,
        signal: {
          id: createHash('sha256')
            .update(JSON.stringify([evidenceKey, position.line, position.column, rule.ruleId]))
            .digest('hex'),
          category: rule.category,
          ruleId: rule.ruleId,
          ...position,
          flow: 'unknown',
          authorization: 'unknown'
        }
      })
      if (++count === MAX_WORKSPACE_SENSITIVE_SIGNALS) {
        break
      }
    }
  }
  return candidates
    .sort(
      (left, right) =>
        left.offset - right.offset || left.signal.ruleId.localeCompare(right.signal.ruleId)
    )
    .slice(0, MAX_WORKSPACE_SENSITIVE_SIGNALS)
    .map(({ signal }) => signal)
}

function redactRule(text: string, rule: SensitiveRule): string {
  const chunks: string[] = []
  let cursor = 0
  for (const match of text.matchAll(new RegExp(rule.pattern))) {
    const span = sensitiveSpan(match, rule)
    if (!span) {
      continue
    }
    chunks.push(text.slice(cursor, span.start), `[${rule.category} redacted]`)
    cursor = span.end
  }
  chunks.push(text.slice(cursor))
  return chunks.join('')
}

export function redactWorkspaceText(text: string): string {
  if (
    rules.some(
      (rule) => rule.category === 'confidential_marker' && new RegExp(rule.pattern).test(text)
    )
  ) {
    return '[Confidential document omitted from review preview and external requests]'
  }
  return redactJevText(rules.reduce((redacted, rule) => redactRule(redacted, rule), text))
}
