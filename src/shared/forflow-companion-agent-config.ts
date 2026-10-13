import type { CompanionAgent } from './forflow-companion'
import type { TuiAgentConfigSource } from './tui-agent-config-types'

export const FORFLOW_COMPANION_AGENT_CONFIG = {
  aily: {
    detectCmd: 'lark-cli',
    detectRequiredCommands: ['forflow'],
    launchCmd: 'forflow aily',
    expectedProcess: 'forflow-aily',
    promptInjectionMode: 'argv',
    argvPromptSeparator: '--',
    draftPromptFlag: '--prefill'
  },
  workbuddy: {
    detectCmd: 'workbuddy',
    detectRequiredCommands: ['forflow'],
    launchCmd: 'forflow workbuddy',
    expectedProcess: 'forflow-workbuddy',
    promptInjectionMode: 'argv',
    argvPromptSeparator: '--',
    draftPromptFlag: '--prefill'
  }
} satisfies Record<CompanionAgent, TuiAgentConfigSource>
