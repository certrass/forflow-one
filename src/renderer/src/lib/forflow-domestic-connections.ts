import { translate } from '@/i18n/i18n'
import type { TuiAgent } from '../../../shared/tui-agent'

export const FORFLOW_DOMESTIC_CONNECTIONS_SECTION = 'forflow-domestic-connections'

type DomesticConnection = {
  id: string
  title: string
  description: string
  history: string
  steps: string[]
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
      steps: [],
      agentId: null,
      command: 'arkcli',
      documentation: 'https://github.com/volcengine/ark-cli'
    },
    {
      id: 'aily',
      title: translate('forflow.aily.title', 'Doubao work partner'),
      description: translate(
        'forflow.domestic.ailyCliDescription',
        'Send requests to your Feishu partner and continue the conversation here.'
      ),
      history: translate('forflow.domestic.ailyHistory', 'Continue your Feishu conversation'),
      steps: [
        translate(
          'forflow.domestic.ailyStep1',
          'Sign in to Feishu using its official connection tool.'
        ),
        translate(
          'forflow.domestic.ailyStep2',
          'Choose Doubao work partner in a new task to continue your Feishu conversation.'
        )
      ],
      agentId: 'aily',
      command: 'forflow aily',
      documentation: 'https://github.com/larksuite/cli'
    },
    {
      id: 'workbuddy',
      title: translate('forflow.domestic.workbuddyCli', 'WorkBuddy'),
      description: translate(
        'forflow.domestic.workbuddyCliDescription',
        'Use your WorkBuddy account to work on projects and view replies here.'
      ),
      history: translate('forflow.domestic.workbuddyHistory', 'Tasks and conversation resume'),
      steps: [
        translate('forflow.domestic.workbuddyStep1', 'Install WorkBuddy and sign in.'),
        translate(
          'forflow.domestic.workbuddyStep2',
          'Choose WorkBuddy in a new task and describe what you need.'
        )
      ],
      agentId: 'workbuddy',
      command: 'forflow workbuddy',
      documentation: 'https://www.workbuddy.cn/'
    },
    {
      id: 'qoderwork',
      title: translate('forflow.domestic.qoderwork', 'Qoder CN'),
      description: translate(
        'forflow.domestic.qoderworkDescription',
        'Work on code with Qoder in your project terminal.'
      ),
      history: translate('forflow.domestic.historyUnavailable', 'History not connected yet'),
      steps: [
        translate(
          'forflow.domestic.qoderStep1',
          'Install Qoder CN CLI using the official guide, then sign in.'
        ),
        translate(
          'forflow.domestic.qoderStep2',
          'Choose Qoder CN when opening an agent terminal. QoderWork conversations stay in QoderWork.'
        )
      ],
      agentId: 'qoder-cn',
      command: 'qodercn',
      documentation: 'https://docs.qoder.cn/cli/quickstart'
    }
  ]
}

export function getDomesticCliDetectionLabel(detected: boolean | null, failed: boolean): string {
  if (failed) {
    return translate('forflow.domestic.detectionFailed', 'Check failed')
  }
  if (detected === null) {
    return translate('forflow.domestic.detecting', 'Checking…')
  }
  return detected
    ? translate('forflow.domestic.detected', 'Launch tool found')
    : translate('forflow.domestic.undetected', 'Setup needed')
}
