import { extractExecutableToken } from '../../shared/managed-agent-command-token'
import type { GlobalSettings } from '../../shared/global-settings-types'
import {
  KNOWN_TUI_AGENT_DETECTION_COMMANDS,
  type TuiAgentDetectionCommand
} from '../ipc/tui-agent-detection-commands'

export type AgentCommandOverrides = GlobalSettings['agentCmdOverrides']

export function agentDetectionCommandsWithOverrides(
  overrides: AgentCommandOverrides,
  platform: NodeJS.Platform
): { commands: TuiAgentDetectionCommand[]; overrideCommands: Set<string> } {
  const commands: TuiAgentDetectionCommand[] = []
  const overrideCommands = new Set<string>()
  const handledOverrides = new Set<string>()
  for (const command of KNOWN_TUI_AGENT_DETECTION_COMMANDS) {
    if (!Object.hasOwn(overrides, command.id)) {
      commands.push(command)
      continue
    }
    if (handledOverrides.has(command.id)) {
      continue
    }
    handledOverrides.add(command.id)
    const executable = extractExecutableToken(overrides[command.id], { platform })
    // Control characters cannot round-trip through the WSL lookup receipt.
    if (!executable || /[\0\r\n\t]/.test(executable)) {
      continue
    }
    overrideCommands.add(executable)
    commands.push({ ...command, cmd: executable })
  }
  return { commands, overrideCommands }
}
