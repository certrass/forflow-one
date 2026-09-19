import type { WebContents } from 'electron'
import { z } from 'zod'
import { requestForflowApproval } from './approval-broker'
import { assertForflowRequestAllowed } from './network-request-policy'
import { hasSystemMediaAccess, requestSystemMediaAccess } from '../browser/browser-media-access'
import { describeForflowTransfer, requireForflowTransferApproval } from './transfer-approval'
import { isForflowPrivateDeployment } from './deployment-policy'

const AUTOMATIC = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock'])
type PagePermissionState = { grants: Set<string>; controller: AbortController }
const states = new WeakMap<WebContents, PagePermissionState>()

export function forflowBrowserPageState(guest: WebContents): PagePermissionState {
  let state = states.get(guest)
  if (!state) {
    state = { grants: new Set(), controller: new AbortController() }
    states.set(guest, state)
    guest.on('did-navigate', () => {
      const current = states.get(guest)
      current?.controller.abort()
      states.set(guest, { grants: new Set(), controller: new AbortController() })
    })
    guest.once('destroyed', () => {
      states.get(guest)?.controller.abort()
      states.delete(guest)
    })
  }
  return state
}

function sameOrigin(guest: WebContents, requestingUrl: string): boolean {
  try {
    const url = new URL(requestingUrl)
    assertForflowRequestAllowed(url.href)
    return (
      ['https:', 'http:'].includes(url.protocol) && url.origin === new URL(guest.getURL()).origin
    )
  } catch {
    return false
  }
}

export function checkForflowBrowserPermission(
  guest: WebContents | null,
  permission: string,
  requestingOrigin: string,
  mediaType?: string
): boolean {
  if (!guest || guest.isDestroyed() || !sameOrigin(guest, requestingOrigin)) {
    return false
  }
  if (AUTOMATIC.has(permission)) {
    return true
  }
  const state = states.get(guest)
  if (permission === 'media') {
    return Boolean(state?.grants.has(`media:${mediaType}`)) && hasSystemMediaAccess(mediaType)
  }
  return state?.grants.has(permission) ?? false
}

export async function requestForflowBrowserPermission(
  guest: WebContents,
  permission: string,
  details?: Electron.PermissionRequest & { mediaTypes?: readonly string[] }
): Promise<boolean> {
  const requestingUrl = details?.requestingUrl || guest.getURL()
  if (guest.isDestroyed() || details?.isMainFrame === false || !sameOrigin(guest, requestingUrl)) {
    return false
  }
  if (AUTOMATIC.has(permission)) {
    return true
  }
  const types = z
    .array(z.enum(['audio', 'video']))
    .parse(details && 'mediaTypes' in details ? details.mediaTypes : [])
  const keys = permission === 'media' ? types.map((type) => `media:${type}`) : [permission]
  const labels: Record<string, string> = {
    'clipboard-read': '读取系统剪贴板',
    notifications: '发送桌面通知',
    'media:audio': '使用麦克风',
    'media:video': '使用摄像头'
  }
  if (keys.length === 0 || keys.some((key) => !labels[key])) {
    return false
  }
  const state = forflowBrowserPageState(guest)
  if (!keys.every((key) => state.grants.has(key))) {
    const allowed = await requestForflowApproval(
      {
        kind: 'browser-permission',
        destination: `网站：${new URL(requestingUrl).origin}`,
        description: `请求权限：${keys.map((key) => labels[key]).join('、')}。\n仅对当前页面有效；刷新、导航或关闭页面后清除。系统权限仍需单独允许。`
      },
      state.controller.signal
    )
    if (!allowed) {
      return false
    }
  }
  if (
    permission === 'media' &&
    !(await requestSystemMediaAccess({
      ...details,
      isMainFrame: details?.isMainFrame ?? true,
      requestingUrl,
      mediaTypes: types
    }))
  ) {
    return false
  }
  if (state.controller.signal.aborted || guest.isDestroyed() || !sameOrigin(guest, requestingUrl)) {
    return false
  }
  for (const key of keys) {
    state.grants.add(key)
  }
  return true
}

export async function confirmForflowBrowserUpload(
  guest: WebContents,
  paths: string[]
): Promise<() => void> {
  if (!isForflowPrivateDeployment()) {
    return () => {}
  }
  const url = guest.getURL()
  if (!sameOrigin(guest, url)) {
    throw new Error('无法确认网页上传目标。')
  }
  const state = forflowBrowserPageState(guest)
  await requireForflowTransferApproval(
    `网页：${new URL(url).origin}`,
    `${describeForflowTransfer(paths)}\n此网页及其嵌入内容将能读取这些文件，网页可以继续将内容发送到其配置的服务。`,
    state.controller.signal
  )
  const validate = (): void => {
    if (state.controller.signal.aborted || guest.isDestroyed() || guest.getURL() !== url) {
      throw new Error('网页已变化，请重新确认上传。')
    }
  }
  validate()
  return validate
}
