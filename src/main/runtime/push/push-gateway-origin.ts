import { cleanCloudServiceOrigin } from '../../../shared/cloud-service-url'
import { assertForflowCloudCapability } from '../../forflow/deployment-policy'

export function resolvePushGatewayOrigin(env: NodeJS.ProcessEnv, packaged: boolean): string {
  assertForflowCloudCapability('push', env)
  return cleanCloudServiceOrigin(env.ORCA_PUSH_GATEWAY_URL, !packaged) ?? 'https://push.onorca.dev'
}
