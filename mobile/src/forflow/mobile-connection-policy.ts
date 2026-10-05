import { isUpstreamServiceUrl } from '../../../src/shared/forflow-service-policy'
import type { HostProfile, PairingOffer } from '../transport/types'

export const FORFLOW_MOBILE_NAME = 'Forflow One'
export const FORFLOW_MOBILE_SCHEME = 'forflow-one-mobile'
export const FORFLOW_MOBILE_REPOSITORY = 'https://github.com/certrass/forflow-one'
export const FORFLOW_MOBILE_REMOTE_PUSH_ENABLED = false
export const FORFLOW_MOBILE_RELAY_ENABLED = false
export const FORFLOW_MOBILE_DIAGNOSTICS_UPLOAD_ENABLED = false

export function assertForflowDirectEndpoint(endpoint: string): void {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new Error('请输入完整的 Forflow One 桌面连接地址。')
  }
  if (isUpstreamServiceUrl(endpoint)) {
    throw new Error('Forflow One 手机端不连接 Orca 账号或云服务。请在桌面端选择本地网络配对。')
  }
  if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new Error('桌面连接地址必须使用 ws:// 或 wss://，且不能包含账号、密码或片段。')
  }
}

export function assertForflowPairingOffer(offer: PairingOffer): void {
  assertForflowDirectEndpoint(offer.endpoint)
  if (offer.relay) {
    throw new Error('此配对码包含云中继。请在 Forflow One 桌面端选择本地网络，再生成配对码。')
  }
}

export function assertForflowHostProfile(host: HostProfile): void {
  assertForflowDirectEndpoint(host.endpoint)
  if (host.relay || host.relayHostId || host.endpoints?.some(({ kind }) => kind === 'relay')) {
    throw new Error('此设备使用云中继，请移除后通过 Forflow One 的本地网络配对码重新连接。')
  }
  host.endpoints?.forEach(({ url }) => assertForflowDirectEndpoint(url))
}
