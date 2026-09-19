import type { PersistedState } from '../../shared/persisted-state-types'
import { join } from 'node:path'
import { applyAgentPermissionMode } from '../../shared/tui-agent-permissions'
import { isForflowPrivateDeployment } from './deployment-policy'

export function applyForflowFreshProfileDefaults(
  state: PersistedState,
  homeDirectory: string,
  env: NodeJS.ProcessEnv = process.env
): PersistedState {
  if (!isForflowPrivateDeployment(env)) {
    return state
  }
  const permissions = applyAgentPermissionMode({
    mode: 'manual',
    agentDefaultArgs: state.settings.agentDefaultArgs,
    agentDefaultEnv: state.settings.agentDefaultEnv
  })
  return {
    ...state,
    settings: {
      ...state.settings,
      ...permissions,
      agentDefaultArgs: {
        ...permissions.agentDefaultArgs,
        codebuddy: '--permission-mode default',
        'qoder-cn': '--permission-mode default'
      },
      agentDefaultEnv: {
        ...permissions.agentDefaultEnv,
        codebuddy: {
          ...permissions.agentDefaultEnv.codebuddy,
          DISABLE_TELEMETRY: '1',
          DISABLE_ERROR_REPORTING: '1',
          DISABLE_AUTOUPDATER: '1',
          DISABLE_FEEDBACK_COMMAND: '1'
        }
      },
      workspaceDir: join(homeDirectory, 'Forflow One', 'workspaces'),
      minimaxEndpoint: 'cn',
      uiLanguage: 'zh',
      artifactSharingEnabled: false,
      agentSkillSharingEnabled: false,
      showMobileButton: false
    }
  }
}
