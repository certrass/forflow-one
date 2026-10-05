import { randomUUID } from 'node:crypto'
import type { CodexReview, CodexReviewVersion } from '../../shared/codex-review-types'

export function addWorkspaceSensitiveFindings(
  review: CodexReview,
  version: CodexReviewVersion
): void {
  for (const file of version.workspace?.files ?? []) {
    if (!file.signals.length) {
      continue
    }
    review.issues.push({
      id: randomUUID(),
      versionId: version.id,
      evidenceKey: file.evidenceKey,
      title: `敏感线索待核实：${file.path}`.slice(0, 200),
      detail: `本地格式检测发现 ${file.signals.length} 条线索（最多展示 100 条），不代表已发生外发或违规。请核对原文用途、接收方、流向与授权，并记录处理理由。\n${file.signals
        .slice(0, 20)
        .map((signal) => `${signal.ruleId} · ${signal.line}:${signal.column} · 外发未知 · 授权未知`)
        .join('\n')}`,
      status: 'open',
      createdAt: Date.now(),
      resolution: null,
      resolvedInVersion: null
    })
  }
}
