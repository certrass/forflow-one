import { EventEmitter } from 'node:events'
import type { WebContents } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  approval: vi.fn(),
  systemRequest: vi.fn(),
  systemCheck: vi.fn()
}))
vi.mock('./approval-broker', () => ({
  requestForflowApproval: mocks.approval,
  FORFLOW_UPLOAD_CANCELLED: '已取消数据传输'
}))
vi.mock('../browser/browser-media-access', () => ({
  requestSystemMediaAccess: mocks.systemRequest,
  hasSystemMediaAccess: mocks.systemCheck
}))
import {
  checkForflowBrowserPermission,
  requestForflowBrowserPermission,
  confirmForflowBrowserUpload
} from './browser-permissions'

class Guest extends EventEmitter {
  url = 'https://site.example/form'
  getURL = () => this.url
  isDestroyed = () => false
}
let raw: Guest
let guest: WebContents
beforeEach(() => {
  vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'cn-private')
  vi.clearAllMocks()
  mocks.approval.mockResolvedValue(true)
  mocks.systemRequest.mockResolvedValue(true)
  mocks.systemCheck.mockReturnValue(true)
  raw = new Guest()
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: this double supplies every WebContents method used by the permission policy.
  guest = raw as unknown as WebContents
})
afterEach(() => vi.unstubAllEnvs())
describe('private browser permission boundaries', () => {
  it.each([
    'clipboard-read',
    'notifications',
    'media',
    'storage-access',
    'persistent-storage',
    'geolocation'
  ])('does not inherit an implicit %s grant', (permission) => {
    expect(checkForflowBrowserPermission(guest, permission, 'https://site.example', 'audio')).toBe(
      false
    )
  })
  it('grants only the approved document and clears grants on navigation', async () => {
    await expect(requestForflowBrowserPermission(guest, 'clipboard-read')).resolves.toBe(true)
    expect(checkForflowBrowserPermission(guest, 'clipboard-read', 'https://site.example')).toBe(
      true
    )
    expect(checkForflowBrowserPermission(guest, 'clipboard-read', 'https://other.example')).toBe(
      false
    )
    raw.emit('did-navigate')
    expect(checkForflowBrowserPermission(guest, 'clipboard-read', 'https://site.example')).toBe(
      false
    )
  })
  it('asks separately before requesting the operating-system microphone', async () => {
    mocks.approval.mockResolvedValue(false)
    const details = { requestingUrl: raw.url, isMainFrame: true, mediaTypes: ['audio'] }
    await expect(requestForflowBrowserPermission(guest, 'media', details)).resolves.toBe(false)
    expect(mocks.systemRequest).not.toHaveBeenCalled()
    mocks.approval.mockResolvedValue(true)
    await expect(requestForflowBrowserPermission(guest, 'media', details)).resolves.toBe(true)
    expect(checkForflowBrowserPermission(guest, 'media', 'https://site.example', 'audio')).toBe(
      true
    )
    expect(checkForflowBrowserPermission(guest, 'media', 'https://site.example', 'video')).toBe(
      false
    )
  })
  it('requires the OS grant as well as the page grant', async () => {
    mocks.systemRequest.mockResolvedValue(false)
    await expect(
      requestForflowBrowserPermission(guest, 'media', {
        requestingUrl: raw.url,
        isMainFrame: true,
        mediaTypes: ['video']
      })
    ).resolves.toBe(false)
    expect(checkForflowBrowserPermission(guest, 'media', 'https://site.example', 'video')).toBe(
      false
    )
  })
  it('refuses cross-origin frames, opaque origins and upstream services without prompting', async () => {
    for (const requestingUrl of [
      'https://other.example',
      'data:text/html,x',
      'https://login.onorca.dev'
    ]) {
      await expect(
        requestForflowBrowserPermission(guest, 'notifications', {
          requestingUrl,
          isMainFrame: true
        })
      ).resolves.toBe(false)
    }
    await expect(
      requestForflowBrowserPermission(guest, 'notifications', {
        requestingUrl: raw.url,
        isMainFrame: false
      })
    ).resolves.toBe(false)
    expect(mocks.approval).not.toHaveBeenCalled()
  })
  it('refuses late approval after navigation even back to the same URL', async () => {
    mocks.approval.mockImplementation(async () => {
      raw.emit('did-navigate')
      return true
    })
    await expect(requestForflowBrowserPermission(guest, 'notifications')).resolves.toBe(false)
    await expect(confirmForflowBrowserUpload(guest, ['/fixture/report.txt'])).rejects.toThrow(
      '网页已变化'
    )
  })
  it('cancels automated file selection before the page can read files', async () => {
    mocks.approval.mockResolvedValue(false)
    await expect(confirmForflowBrowserUpload(guest, ['/fixture/report.txt'])).rejects.toThrow(
      '已取消'
    )
    expect(mocks.approval).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'upload', destination: '网页：https://site.example' }),
      expect.any(AbortSignal)
    )
  })
})
