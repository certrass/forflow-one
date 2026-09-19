import { isForflowBuild } from '../../shared/product-branding'

export type ForflowDeploymentProfile = 'upstream' | 'cn-private'

export type ForflowCloudCapability =
  | 'account'
  | 'sharing'
  | 'push'
  | 'marketplace'
  | 'updates'
  | 'diagnostic-upload'

export const FORFLOW_MANAGED_UPDATE_MESSAGE =
  '此企业配置由管理员维护，请使用经过验证的 Forflow One 升级包。'

export function getForflowDeploymentProfile(
  env: NodeJS.ProcessEnv = process.env
): ForflowDeploymentProfile {
  const profile =
    env.FORFLOW_DEPLOYMENT_PROFILE?.trim() || (isForflowBuild() ? 'cn-private' : 'upstream')
  if (isForflowBuild() && profile !== 'cn-private') {
    throw new Error('Forflow One builds require the cn-private deployment profile.')
  }
  if (profile === 'upstream' || profile === 'cn-private') {
    return profile
  }
  throw new Error('Invalid FORFLOW_DEPLOYMENT_PROFILE; expected upstream or cn-private.')
}

export function isForflowPrivateDeployment(env: NodeJS.ProcessEnv = process.env): boolean {
  return getForflowDeploymentProfile(env) === 'cn-private'
}

export function assertForflowCloudCapability(
  capability: ForflowCloudCapability,
  env: NodeJS.ProcessEnv = process.env
): void {
  if (isForflowPrivateDeployment(env)) {
    throw new Error(`Forflow One 企业配置已禁用此云端功能（${capability}）。`)
  }
}
