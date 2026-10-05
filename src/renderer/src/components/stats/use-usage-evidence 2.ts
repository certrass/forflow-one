import { useAppStore } from '../../store'
import { buildUsageEvidence, type UsageEvidenceSelection } from './usage-evidence-model'

export function useUsageEvidence(selection: UsageEvidenceSelection) {
  const claudeScan = useAppStore((s) => s.claudeUsageScanState)
  const claudeSummary = useAppStore((s) => s.claudeUsageSummary)
  const codexScan = useAppStore((s) => s.codexUsageScanState)
  const codexSummary = useAppStore((s) => s.codexUsageSummary)
  const openCodeScan = useAppStore((s) => s.openCodeUsageScanState)
  const openCodeSummary = useAppStore((s) => s.openCodeUsageSummary)
  return buildUsageEvidence(
    {
      claude: { scanState: claudeScan, summary: claudeSummary, daily: [] },
      codex: { scanState: codexScan, summary: codexSummary, daily: [] },
      opencode: { scanState: openCodeScan, summary: openCodeSummary, daily: [] }
    },
    selection
  )
}
