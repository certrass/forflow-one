import { useState } from 'react'
import { ChevronDown, ShieldCheck } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import type { UsageEvidenceSelection } from './usage-evidence-model'
import { useUsageEvidence } from './use-usage-evidence'
import { UsageEvidenceSources } from './UsageEvidenceSources'
import { CodexAccountUsage } from './CodexAccountUsage'
import { CodexAuditDetails } from './CodexAuditDetails'
import { useCodexUsageAudit } from './use-codex-usage-audit'

const AUDIT_DIMENSIONS = [
  {
    name: '上下文',
    kind: 'context',
    status: '未关联',
    visible: 'Codex 日志中的回合上下文与压缩事件；未留存的历史不能回填。',
    missing: '每次调用实际发送的上下文版本、材料来源、裁剪与脱敏记录。'
  },
  {
    name: '模型调用',
    kind: 'request',
    status: null,
    visible: '已读取的 Token、模型与会话记录；模型或项目归属可能缺失。',
    missing: '完整请求清单、请求 ID、失败及重试、供应商账单；用量记录数不等于调用次数。'
  },
  {
    name: '工具调用',
    kind: 'tool',
    status: '未接入',
    visible: 'Codex 日志中的工具名称、调用编号及返回记录；不从任意命令文本推断数据读取。',
    missing: '工具名称、参数摘要、权限决定、结果状态，以及与模型调用的关联。'
  },
  {
    name: '数据读取',
    kind: 'data',
    status: '未接入',
    visible: '现有项目或文件路径归属只用于统计，不能证明实际读取了哪些数据。',
    missing: '文件版本、表及字段范围、读取主体、授权依据与结果；不能从 Token 数反推。'
  }
] as const

export function UsageEvidencePanel({ selection }: { selection: UsageEvidenceSelection }) {
  const model = useUsageEvidence(selection)
  const { audit, error, loading } = useCodexUsageAudit(selection)
  const hasCodex = selection === 'codex' || selection === 'overview'
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <>
      {hasCodex && (
        <div className="mt-4">
          <CodexAccountUsage />
        </div>
      )}
      <section
        aria-label="审计覆盖 Beta"
        data-forflow-usage-evidence
        className="mt-4 space-y-3 border-t pt-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-muted-foreground" />
            审计覆盖 <Badge variant="secondary">Beta</Badge>
          </h3>
          <UsageEvidenceSources sources={model.sources} />
        </div>
        <p className="text-xs text-muted-foreground">
          已读取 {model.observedRecords.toLocaleString()} 条用量记录 · 点击下方查看证据与缺口
        </p>
        {audit && (
          <p className="text-xs text-muted-foreground">
            Codex 明细：已读取 {audit.filesRead} / {audit.candidateFiles} 个候选日志文件；
            {audit.truncatedFiles} 个仅读取尾部。每次最多 8 个文件、每个 2 MiB，非全量审计。
            {audit.failedFiles > 0 ? ` ${audit.failedFiles} 个文件读取失败。` : ''}
            {audit.skippedUnknownScope > 0
              ? ` ${audit.skippedUnknownScope} 条记录因范围无法确认未计入。`
              : ''}
            {audit.malformedLines > 0 ? ` ${audit.malformedLines} 条损坏记录已跳过。` : ''}
          </p>
        )}
        {loading && <p className="text-xs text-muted-foreground">正在读取 Codex 审计明细…</p>}
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        {model.hasReadError && (
          <p role="alert" className="text-xs text-destructive">
            部分来源读取异常，当前为上次快照。请刷新对应来源。
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {AUDIT_DIMENSIONS.map((item) => (
            <Collapsible
              key={item.name}
              className="contents"
              open={expanded === item.name}
              onOpenChange={(open) => setExpanded(open ? item.name : null)}
            >
              <div className="space-y-1">
                <CollapsibleTrigger asChild>
                  <Button
                    variant={expanded === item.name ? 'secondary' : 'outline'}
                    size="sm"
                    className="w-full justify-between"
                    aria-label={`${item.name}审计详情`}
                  >
                    {item.name}
                    <ChevronDown className="size-3.5" />
                  </Button>
                </CollapsibleTrigger>
                <p className="px-1 text-xs text-muted-foreground">
                  {audit && item.kind !== 'data'
                    ? `Codex ${audit.counts[item.kind].toLocaleString()} 条 · 局部可见`
                    : (item.status ?? model.modelCoverage)}
                </p>
              </div>
              <CollapsibleContent
                className="order-last col-span-full"
                aria-label={`${item.name}审计证据`}
              >
                <div className="space-y-2 rounded-md bg-muted/40 p-3 text-xs">
                  <p className="font-medium">
                    {item.name} ·{' '}
                    {audit && item.kind !== 'data'
                      ? `Codex ${audit.counts[item.kind].toLocaleString()} 条 · 局部可见`
                      : (item.status ?? model.modelCoverage)}
                  </p>
                  <p className="text-muted-foreground">
                    现有证据：
                    {item.name === '模型调用' && model.observedRecords === 0
                      ? '当前来源或范围尚无可核验的模型用量记录。'
                      : item.visible}
                  </p>
                  {audit && <CodexAuditDetails audit={audit} kind={item.kind} />}
                  <p className="text-muted-foreground">待补证据：{item.missing}</p>
                  <p className="text-muted-foreground">尚缺全部活动分母，暂不展示覆盖百分比。</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </section>
    </>
  )
}
