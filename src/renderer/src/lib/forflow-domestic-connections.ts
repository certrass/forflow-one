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
      id: 'workbuddy',
      title: translate('forflow.domestic.workbuddy', 'WorkBuddy / CodeBuddy'),
      description: translate(
        'forflow.domestic.workbuddyDescription',
        'Forflow launches Tencent CodeBuddy CLI. WorkBuddy is a separate desktop app; installing it does not install the standalone CLI or import its account and conversations.'
      ),
      history: translate('forflow.domestic.codebuddyHistory', 'CodeBuddy CLI history and resume'),
      agentId: 'codebuddy',
      command: 'codebuddy',
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
