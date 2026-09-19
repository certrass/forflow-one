import { isUpstreamServiceUrl } from '../../shared/forflow-service-policy'
import { isForflowPrivateDeployment } from './deployment-policy'

export function isBlockedForflowRequest(url: string): boolean {
  return isForflowPrivateDeployment() && isUpstreamServiceUrl(url)
}

export function assertForflowRequestAllowed(url: string): void {
  if (isBlockedForflowRequest(url)) {
    throw new Error('Forflow One 已阻止连接 Orca 上游服务。')
  }
}

export function installForflowFetchGuard(): void {
  if (!isForflowPrivateDeployment()) {
    return
  }
  const original = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    assertForflowRequestAllowed(url)
    // Private deployments must inspect a redirect target before contacting it.
    return original(input, { ...init, redirect: init?.redirect === 'manual' ? 'manual' : 'error' })
  }
}
