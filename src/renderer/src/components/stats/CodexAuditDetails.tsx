import type { CodexAuditKind, CodexUsageAudit } from '../../../../shared/codex-usage-audit-types'

export function CodexAuditDetails({
  audit,
  kind
}: {
  audit: CodexUsageAudit
  kind: CodexAuditKind
}) {
  const rows = audit.rows.filter((row) => row.kind === kind)
  return (
    <div className="space-y-2">
      <p>
        Codex 当前片段共 {audit.counts[kind].toLocaleString()} 条
        {kind === 'tool'
          ? `，其中 ${audit.toolResults.toLocaleString()} 条找到返回记录；存在返回不代表执行成功。`
          : '。'}
      </p>
      {rows.length > 0 && (
        <ol
          className="max-h-64 space-y-2 overflow-auto scrollbar-sleek"
          aria-label="Codex 实际审计记录"
        >
          {rows.map((row) => (
            <li key={`${row.sourcePath}:${row.byteOffset}`} className="space-y-1 border-t pt-2">
              <p className="font-medium">
                {row.name} · {new Date(row.timestamp).toLocaleString('zh-CN')}
              </p>
              {row.recordId && <p className="break-all font-mono">{row.recordId}</p>}
              {row.tokens !== null && <p>{row.tokens.toLocaleString()} Token</p>}
              {row.hasResult !== null && (
                <p>{row.hasResult ? '已找到返回记录' : '当前片段未找到返回记录'}</p>
              )}
              <p className="break-all text-muted-foreground">
                来源：{row.sourcePath} · 字节 {row.byteOffset}
              </p>
            </li>
          ))}
        </ol>
      )}
      {kind === 'data' && (
        <p>
          暂未关联到数据访问审计源。工具返回和文件路径不能证明读取了哪些字段，也不能证明读取获得授权。
        </p>
      )}
      <p className="text-muted-foreground">
        仅展示最近 12 条明细；不复制提示词、工具参数和返回正文。
      </p>
    </div>
  )
}
