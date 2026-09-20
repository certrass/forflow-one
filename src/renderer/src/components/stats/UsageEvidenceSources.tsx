import { getIntlLocale } from '@/i18n/i18n'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import type { UsageEvidenceSource } from './usage-evidence-model'

export function UsageEvidenceSources({ sources }: { sources: UsageEvidenceSource[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs">
          来源与范围
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80" aria-label="用量证据来源">
        <div className="max-h-80 space-y-3 overflow-y-auto scrollbar-sleek">
          <h4 className="text-sm font-medium">当前统计依据</h4>
          {sources.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Grok 当前仅提供套餐额度，尚未接入逐条用量记录。
            </p>
          )}
          {sources.map((source) => (
            <div key={source.id} className="space-y-1 text-xs">
              <p className="font-medium">
                {source.label} · {source.stateLabel}
              </p>
              <p className="text-muted-foreground">
                {source.scope} · {source.range} · {source.observedRecords.toLocaleString()}{' '}
                {source.activityLabel === 'turns' ? '条轮次记录' : '条计量事件'}
              </p>
              {source.enabled && source.lastScanCompletedAt && (
                <p className="text-muted-foreground">
                  扫描于 {new Date(source.lastScanCompletedAt).toLocaleString(getIntlLocale())}
                </p>
              )}
              <p className="text-muted-foreground">
                {source.id === 'opencode'
                  ? '本地日志申报金额；逐条完整性可能未知。'
                  : '本地 Token 记录 × 内置价格表；价格随应用版本更新。'}
              </p>
            </div>
          ))}
          <p className="border-t pt-2 text-xs text-muted-foreground">
            按各来源当前筛选汇总，时间与工作区范围可能不同。仅含当前主机已读取的日志，不包含未接入的
            SSH 或其他主机。
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
