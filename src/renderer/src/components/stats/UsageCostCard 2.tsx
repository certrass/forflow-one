import { useState } from 'react'
import { ChevronDown, Coins } from 'lucide-react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { StatCard } from './StatCard'
import { formatUsageCost } from './usage-overview-model'
import type { UsageEvidenceSelection } from './usage-evidence-model'
import { useUsageEvidence } from './use-usage-evidence'

const COST_BASES = [
  { id: 'estimated', label: '估算' },
  { id: 'settled', label: '已结算' },
  { id: 'allocated', label: '套餐分摊' },
  { id: 'unmetered', label: '不可计量' }
] as const

export function UsageCostCard({ selection }: { selection: UsageEvidenceSelection }) {
  const model = useUsageEvidence(selection)
  const [basis, setBasis] = useState<(typeof COST_BASES)[number]>(COST_BASES[0])
  const partial = model.unpricedRecords > 0 || model.unclassifiedRecords > 0
  const views = {
    estimated: {
      value: model.estimatedCostUsd === null ? '暂无金额' : formatUsageCost(model.estimatedCostUsd),
      description: model.hasReadError ? '读取异常 · 上次快照' : partial ? '已知部分' : '非实际扣费'
    },
    settled: { value: '未接入账单', description: '待账单对账' },
    allocated: { value: '未配置分摊', description: '待设分摊规则' },
    unmetered: {
      value: model.observedRecords
        ? `${model.unpricedRecords.toLocaleString()} 条缺价`
        : '尚无法判断',
      description:
        model.unclassifiedRecords > 0
          ? `另有 ${model.unclassifiedRecords.toLocaleString()} 条完整性未知`
          : '仅含已读取记录 · 不按零元计费'
    }
  }
  const view = views[basis.id]
  return (
    <div data-forflow-usage-cost data-cost-basis={basis.id} className="grid">
      <StatCard
        value={view.value}
        icon={<Coins className="size-4" />}
        label={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="xs" aria-label={`费用口径：${basis.label}`}>
                {basis.label}
                {basis.id === 'estimated' ? ' · USD' : ''} <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>费用口径 · Beta</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={basis.id}
                onValueChange={(id) => {
                  const next = COST_BASES.find((item) => item.id === id)
                  if (next) {
                    setBasis(next)
                  }
                }}
              >
                {COST_BASES.map((item) => (
                  <DropdownMenuRadioItem key={item.id} value={item.id}>
                    {item.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>各口径单独查看，不累加</DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        description={view.description}
      />
    </div>
  )
}
