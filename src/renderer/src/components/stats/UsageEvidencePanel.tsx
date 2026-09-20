import { useAppStore } from '../../store'
import { getIntlLocale } from '@/i18n/i18n'
import { Badge } from '../ui/badge'
import { buildUsageEvidence, type UsageEvidenceSelection } from './usage-evidence-model'
import { formatUsageCost } from './usage-overview-model'

const AUDIT_DIMENSIONS = [
  {
    name: '上下文',
    status: '未关联到用量账本',
    visible: '接续预检可按需生成来源回执，尚未与本页用量记录关联。',
    missing: '每次调用实际发送的上下文版本、材料来源、裁剪与脱敏记录。'
  },
  {
    name: '模型调用',
    status: null,
    visible: '已读取的 Token、模型与会话记录；模型或项目归属可能缺失。',
    missing: '完整请求清单、请求 ID、失败及重试、供应商账单；用量记录数不等于调用次数。'
  },
  {
    name: '工具调用',
    status: '未接入用量账本',
    visible: '会话中可能有工具活动，本页尚未汇总为审计证据。',
    missing: '工具名称、参数摘要、权限决定、结果状态，以及与模型调用的关联。'
  },
  {
    name: '数据读取',
    status: '未接入用量账本',
    visible: '现有项目或文件路径归属只用于统计，不能证明实际读取了哪些数据。',
    missing: '文件版本、表及字段范围、读取主体、授权依据与结果；不能从 Token 数反推。'
  }
]

export function UsageEvidencePanel({
  selection
}: {
  selection: UsageEvidenceSelection
}): React.JSX.Element {
  const claudeScan = useAppStore((s) => s.claudeUsageScanState)
  const claudeSummary = useAppStore((s) => s.claudeUsageSummary)
  const codexScan = useAppStore((s) => s.codexUsageScanState)
  const codexSummary = useAppStore((s) => s.codexUsageSummary)
  const openCodeScan = useAppStore((s) => s.openCodeUsageScanState)
  const openCodeSummary = useAppStore((s) => s.openCodeUsageSummary)
  const model = buildUsageEvidence(
    {
      claude: { scanState: claudeScan, summary: claudeSummary, daily: [] },
      codex: { scanState: codexScan, summary: codexSummary, daily: [] },
      opencode: { scanState: openCodeScan, summary: openCodeSummary, daily: [] }
    },
    selection
  )

  return (
    <section
      aria-label="费用口径与审计覆盖"
      data-forflow-usage-evidence
      className="space-y-4 rounded-lg border bg-card p-4"
    >
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          费用口径与审计覆盖 <Badge variant="secondary">Beta</Badge>
        </h3>
        <p className="text-xs text-muted-foreground">
          审计与用量是运行事件的不同投影。本页先说明已读取的用量及证据缺口，尚未建立统一运行事件审计链。
        </p>
      </div>
      {selection === 'grok' && (
        <p className="text-sm text-muted-foreground">
          Grok 当前仅提供套餐额度，尚未接入逐条用量记录，不能折算为费用或调用审计。
        </p>
      )}
      {model.hasReadError && (
        <p role="alert" className="text-sm text-destructive">
          部分来源读取异常，以下金额与记录可能过时。请在上方对应来源重试刷新。
        </p>
      )}
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1" data-cost-basis="estimated">
          <dt className="text-sm font-medium">估算</dt>
          <dd className="text-sm tabular-nums">
            {model.estimatedCostUsd === null
              ? '暂无可计量金额'
              : `${formatUsageCost(model.estimatedCostUsd)} USD · 已知部分`}
          </dd>
          <dd className="text-xs text-muted-foreground">
            按内置价格表或日志申报值估算，未与账单对账；不是实际扣费。价格表随应用版本更新。
          </dd>
        </div>
        <div className="space-y-1" data-cost-basis="settled">
          <dt className="text-sm font-medium">已结算</dt>
          <dd className="text-sm">未接入账单</dd>
          <dd className="text-xs text-muted-foreground">
            需账单、账期、币种及对账凭据；未接入不代表零费用。
          </dd>
        </div>
        <div className="space-y-1" data-cost-basis="allocated">
          <dt className="text-sm font-medium">套餐分摊</dt>
          <dd className="text-sm">未配置分摊</dd>
          <dd className="text-xs text-muted-foreground">
            需套餐实付金额、账期、分摊规则及分母。Token 占比不能直接当作结算费用。
          </dd>
        </div>
        <div className="space-y-1" data-cost-basis="unmetered">
          <dt className="text-sm font-medium">不可计量</dt>
          <dd className="text-sm">
            {model.observedRecords === 0
              ? '尚无法判断'
              : model.unpricedRecords > 0
                ? `${model.unpricedRecords.toLocaleString()} 条记录缺少可用价格或金额`
                : '已读取记录中未发现明确缺价项'}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {model.unclassifiedRecords > 0
              ? `另有 ${model.unclassifiedRecords.toLocaleString()} 条记录的逐条计量完整性未知。`
              : ''}
            不可计量项不按零元处理；未采集的活动不计入记录数。
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        四种费用口径不相加：同一活动的估算、账单和分摊可能重叠。当前仅汇总美元估算，不进行币种换算。
      </p>
      {model.sources.length > 0 && (
        <div className="space-y-2 border-t pt-3" aria-label="用量证据来源">
          {model.sources.map((source) => (
            <div key={source.id} className="space-y-1 text-xs">
              <p>
                <span className="font-medium">{source.label}</span> · {source.stateLabel}
              </p>
              <p className="text-muted-foreground">
                {source.scope} · {source.range} · {source.observedRecords.toLocaleString()}{' '}
                {source.activityLabel === 'turns' ? '条轮次记录' : '条计量事件'}
                {source.enabled && source.lastScanCompletedAt
                  ? ` · 扫描于 ${new Date(source.lastScanCompletedAt).toLocaleString(getIntlLocale())}`
                  : ''}
              </p>
              <p className="text-muted-foreground">
                {source.id === 'opencode'
                  ? '金额来源：OpenCode 本地日志申报值，逐条完整性可能未知。'
                  : '金额来源：本地 Token 记录 × 内置模型价格表，非供应商账单。'}
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3 border-t pt-3" aria-label="审计覆盖明细">
        <h4 className="text-sm font-medium">审计覆盖</h4>
        <p className="text-xs text-muted-foreground">
          仅针对当前来源快照。不覆盖未接入的 SSH 或其他主机；缺少全部活动分母，暂不展示覆盖百分比。
        </p>
        {AUDIT_DIMENSIONS.map((item) => (
          <div key={item.name} className="space-y-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {item.name}
              <Badge variant="outline">{item.status ?? model.modelCoverage}</Badge>
            </p>
            <p className="text-xs text-muted-foreground">
              现有证据：
              {item.name === '模型调用' && model.observedRecords === 0
                ? '当前来源或范围尚无可核验的模型用量记录。'
                : item.visible}
            </p>
            <p className="text-xs text-muted-foreground">待补证据：{item.missing}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
