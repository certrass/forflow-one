import { translate } from '@/i18n/i18n'
import type { TuiAgent } from '../../../shared/tui-agent'

export const FORFLOW_DOMESTIC_CONNECTIONS_SECTION = 'forflow-domestic-connections'

type DomesticConnection = {
  id: string
  title: string
  description: string
  history: string
  agentId: TuiAgent | null
  command: string
  documentation: string
}

export function getForflowDomesticConnections(): DomesticConnection[] {
  return [
    {
      id: 'doubao',
      title: translate('forflow.domestic.doubao', 'Doubao / Volcengine Ark'),
      description: translate(
        'forflow.domestic.doubaoDescription',
        'Connect Doubao models through Volcengine Ark. Ark CLI provides model and tool commands; configure the approved endpoint, model and credentials in your chosen agent.'
      ),
      history: translate('forflow.domestic.modelTool', 'Model / tool connection'),
      agentId: null,
      command: 'arkcli',
      documentation: 'https://github.com/volcengine/ark-cli'
    },
    {
      id: 'aily',
      title: translate('forflow.aily.title', 'Doubao work partner'),
      description: translate(
        'forflow.domestic.ailyCliDescription',
        'Use your Feishu login with the official CLI. Choose Doubao work partner in a task to continue your personal conversation.'
      ),
      history: translate('forflow.domestic.ailyHistory', 'Continue your Feishu conversation'),
      agentId: 'aily',
      command: 'forflow aily',
      documentation: 'https://github.com/larksuite/cli'
    },
    {
      id: 'workbuddy',
      title: translate('forflow.domestic.workbuddyCli', 'WorkBuddy'),
      description: translate(
        'forflow.domestic.workbuddyCliDescription',
        'Use the CLI bundled with WorkBuddy and its existing login. Start a task in the current workspace and continue it in native chat.'
      ),
      history: translate('forflow.domestic.workbuddyHistory', 'Tasks and conversation resume'),
      agentId: 'workbuddy',
      command: 'forflow workbuddy',
      documentation: 'https://www.codebuddy.cn/docs/cli/installation'
    },
    {
      id: 'qoderwork',
      title: translate('forflow.domestic.qoderwork', 'QoderWork / Qoder CN'),
      description: translate(
        'forflow.domestic.qoderworkDescription',
        'Forflow launches Qoder CN CLI using qodercn. QoderWork is a separate desktop app; its conversations are not imported. Configure and sign in to the domestic CLI on the execution host.'
      ),
      history: translate('forflow.domestic.historyUnavailable', 'History not connected yet'),
      agentId: 'qoder-cn',
      command: 'qodercn',
      documentation: 'https://docs.qoder.cn/cli/quickstart'
    }
  ]
}

export function getDomesticCliDetectionLabel(detected: boolean | null, failed: boolean): string {
  if (failed) {
    return translate('forflow.domestic.detectionFailed', 'Host detection failed')
  }
  if (detected === null) {
    return translate('forflow.domestic.detecting', 'Detecting CLI…')
  }
  return detected
    ? translate('forflow.domestic.detected', 'CLI detected; sign-in is managed by the CLI')
    : translate('forflow.domestic.undetected', 'CLI not detected on this host')
}
