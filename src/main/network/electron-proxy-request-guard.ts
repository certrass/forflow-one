import type { Session } from 'electron'
import { getProxySessionApplicationReadiness } from './proxy-settings'
import { isBlockedForflowRequest } from '../forflow/network-request-policy'

/** Hold default-session requests until the newest app-wide proxy transition settles. */
export function installElectronProxyRequestGuard(proxySession: Session): void {
  proxySession.webRequest.onBeforeRequest((details, callback) => {
    if (isBlockedForflowRequest(details.url)) {
      callback({ cancel: true })
      return
    }
    const readiness = getProxySessionApplicationReadiness(proxySession)
    const answer = (ready: boolean): void => callback(ready ? {} : { cancel: true })
    if (typeof readiness === 'boolean') {
      answer(readiness)
    } else {
      void readiness.then(answer)
    }
  })
}
