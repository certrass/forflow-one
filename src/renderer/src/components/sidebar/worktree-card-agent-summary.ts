import { translate } from '@/i18n/i18n'
import type { AgentDotState } from '@/components/AgentStateDot'
import type { DashboardAgentRow as DashboardAgentRowData } from '@/components/dashboard/useDashboardData'
import { formatAgentTypeLabel } from '@/lib/agent-status'
import { agentRowDotState } from '@/lib/agent-row-dot-state'

export type SummaryAgentGroup = {
  state: AgentDotState
  agents: DashboardAgentRowData[]
}

const SUMMARY_STATE_ORDER: AgentDotState[] = [
  'waiting',
  'blocked',
  'working',
  'monitoring',
  'interrupted',
  'done',
  // Why: below every reporting state, above true idle — the pane is still held.
  'unverifiable',
  'idle'
]

export function getAgentDotState(agent: DashboardAgentRowData): AgentDotState {
  if (agent.entry.interrupted === true) {
    return 'interrupted'
  }
  return agentRowDotState(agent.state, agent.entry.workingMode)
}

export function formatSummaryStateLabel(state: AgentDotState): string {
  switch (state) {
    case 'waiting':
      return translate('forflow.finalCopy.80cfa3e7f2', 'waiting')
    case 'blocked':
      return translate('forflow.finalCopy.6973dddd3e', 'blocked')
    case 'interrupted':
      return translate('forflow.finalCopy.d512d96ea3', 'interrupted')
    case 'failed':
      return translate('forflow.finalCopy.5d28a90f44', 'failed')
    case 'working':
      return translate('forflow.finalCopy.dd5ace9e01', 'working')
    case 'monitoring':
      return translate('forflow.finalCopy.14a2326b6b', 'monitoring')
    case 'done':
      return translate('forflow.finalCopy.a4c3ed04a9', 'done')
    case 'idle':
      return translate('forflow.finalCopy.4fb6234885', 'idle')
    case 'unverifiable':
      return translate('forflow.desktopCopy.b949b6c663', 'not reporting')
    case 'permission':
      return translate('forflow.desktopCopy.ca25baf7eb', 'needs attention')
  }
}

export function buildSummaryAgentGroups(agents: DashboardAgentRowData[]): SummaryAgentGroup[] {
  const groups = new Map<AgentDotState, DashboardAgentRowData[]>()
  for (const agent of agents) {
    const dotState = getAgentDotState(agent)
    const group = groups.get(dotState)
    if (group) {
      group.push(agent)
    } else {
      groups.set(dotState, [agent])
    }
  }
  return SUMMARY_STATE_ORDER.flatMap((state) => {
    const groupAgents = groups.get(state)
    return groupAgents ? [{ state, agents: groupAgents }] : []
  })
}

export function summarizeAgents(agents: DashboardAgentRowData[], subjectLabel: string): string {
  const counts = new Map<AgentDotState, number>()
  for (const agent of agents) {
    const dotState = getAgentDotState(agent)
    counts.set(dotState, (counts.get(dotState) ?? 0) + 1)
  }
  const parts = SUMMARY_STATE_ORDER.flatMap((state) => {
    const count = counts.get(state) ?? 0
    if (count === 0) {
      return []
    }
    const label = formatSummaryStateLabel(state)
    return `${count} ${label}`
  })
  if (parts.length === 1) {
    const onlyStatusLabel = parts[0].replace(/^\d+\s+/, '')
    return agents.length === 1
      ? `${subjectLabel} ${onlyStatusLabel}`
      : translate('forflow.finalCopy.0ab5c44a9a', 'All {{subject}} {{status}}', {
          subject: subjectLabel,
          status: onlyStatusLabel
        })
  }
  return `${subjectLabel}: ${parts.join(', ')}`
}

export function summarizeAgentIdentities(agents: DashboardAgentRowData[]): string {
  return agents
    .map((agent) => {
      const agentLabel = formatAgentTypeLabel(agent.agentType)
      const stateLabel = formatSummaryStateLabel(getAgentDotState(agent))
      return `${agentLabel} ${stateLabel}`
    })
    .join('; ')
}

export function selectSummaryGroupIconAgents(
  agents: DashboardAgentRowData[],
  maxCount: number
): DashboardAgentRowData[] {
  const groups = new Map<string, { agents: DashboardAgentRowData[]; firstIndex: number }>()
  agents.forEach((agent, index) => {
    const key = agent.agentType ?? 'unknown'
    const group = groups.get(key)
    if (group) {
      group.agents.push(agent)
    } else {
      groups.set(key, { agents: [agent], firstIndex: index })
    }
  })
  const sortedGroups = [...groups.values()].sort(
    (a, b) => b.agents.length - a.agents.length || a.firstIndex - b.firstIndex
  )
  const selected: DashboardAgentRowData[] = []
  for (const group of sortedGroups) {
    if (selected.length >= maxCount) {
      break
    }
    selected.push(group.agents[0])
  }
  return selected
}
