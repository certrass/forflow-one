import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('electron', () => ({ app: { isPackaged: true } }))
vi.mock('../git/runner', () => ({ gitExecFileAsync: vi.fn() }))

import { getOrcaCloudAuthConfig } from '../orca-profiles/profile-cloud-auth-config'
import { resolveArtifactCloudApiUrl } from '../artifacts/artifact-cloud-config'
import { resolvePushGatewayOrigin } from '../runtime/push/push-gateway-origin'
import { resolveDiagnosticTokenEndpoint } from '../observability/diagnostic-upload-endpoint'
import { fetchPluginKillList } from '../plugins/plugin-kill-list-service'
import { checkoutPluginGitSource } from '../plugins/plugin-git-repository'
import { gitExecFileAsync } from '../git/runner'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('private cloud boundaries', () => {
  it('does not resolve upstream or overridden account/share/push services', () => {
    const env = {
      FORFLOW_DEPLOYMENT_PROFILE: 'cn-private',
      ORCA_CLOUD_API_URL: 'https://login.onorca.dev'
    }
    expect(getOrcaCloudAuthConfig(env, true).configured).toBe(false)
    expect(() => resolveArtifactCloudApiUrl('https://share.onorca.dev', env, true)).toThrow(
      '已禁用'
    )
    expect(() => resolvePushGatewayOrigin(env, true)).toThrow('已禁用')
  })

  it('prevents diagnostic endpoint overrides and plugin downloads before network or git', async () => {
    vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'cn-private')
    vi.stubEnv('ORCA_DIAGNOSTICS_TOKEN_URL', 'https://example.test/token')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(resolveDiagnosticTokenEndpoint()).toBeNull()
    await expect(fetchPluginKillList()).rejects.toThrow('已禁用')
    await expect(
      checkoutPluginGitSource({
        url: 'https://github.com/example/plugin.git',
        ref: 'main',
        destination: '/unused',
        workingDirectory: '/unused'
      })
    ).rejects.toThrow('已禁用')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(gitExecFileAsync).not.toHaveBeenCalled()
  })

  it('preserves upstream service validation in an unbranded build', () => {
    expect(getOrcaCloudAuthConfig({}, true).configured).toBe(true)
    expect(resolveArtifactCloudApiUrl(undefined, {}, true)).toBe('https://share.onorca.dev')
    expect(() => resolveArtifactCloudApiUrl('http://evil.test', {}, true)).toThrow('HTTPS')
  })
})
