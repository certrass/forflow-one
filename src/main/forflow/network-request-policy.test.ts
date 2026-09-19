import { afterEach, expect, it, vi } from 'vitest'
import { installForflowFetchGuard, isBlockedForflowRequest } from './network-request-policy'
import {
  isUpstreamServiceUrl,
  normalizeForflowServiceUrl
} from '../../shared/forflow-service-policy'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
it.each([
  'https://login.onorca.dev',
  'https://relay.onorca.dev.',
  'https://app.orca.dev/skills',
  'https://sub.stably.ai',
  'https://github.com/stablyai/orca/releases'
])('blocks upstream %s', (url) => {
  vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'cn-private')
  expect(isBlockedForflowRequest(url)).toBe(true)
  expect(() => normalizeForflowServiceUrl(url)).toThrow()
})
it.each([
  'https://onorca.dev.evil.test',
  'https://identity.example.cn',
  'http://127.0.0.1:43120',
  'http://[::1]:43120'
])('does not misclassify %s as an upstream service', (url) => {
  expect(isUpstreamServiceUrl(url)).toBe(false)
  expect(normalizeForflowServiceUrl(url)).toBe(url)
})
it.each([
  'http://identity.example.cn',
  'https://user:password@id.example.cn',
  'https://id.example.cn?token=bad',
  'https://id.example.cn#frag',
  'file:///tmp/service',
  'https://id.example.cn.'
])('rejects unsafe identity endpoint %s', (url) => {
  expect(() => normalizeForflowServiceUrl(url)).toThrow()
})
it('upstream mode retains normal network behavior', () => {
  vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'upstream')
  const original = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', original)
  installForflowFetchGuard()
  expect(fetch).toBe(original)
  expect(isBlockedForflowRequest('https://login.onorca.dev')).toBe(false)
})
it('private fetch blocks before dispatch and refuses automatic redirect bypass', async () => {
  vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'cn-private')
  const original = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', original)
  installForflowFetchGuard()
  await expect(fetch('https://login.onorca.dev')).rejects.toThrow('已阻止')
  expect(original).not.toHaveBeenCalled()
  await fetch('https://identity.example.cn', { redirect: 'follow' })
  expect(original.mock.calls[0][1]?.redirect).toBe('error')
})
