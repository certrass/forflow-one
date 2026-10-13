import { afterEach, describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'
import { getDefaultPersistedState } from '../../shared/constants'
import { getForflowDeploymentProfile, assertForflowCloudCapability } from './deployment-policy'
import { applyForflowFreshProfileDefaults } from './fresh-profile-defaults'
import { resolveConsent } from '../telemetry/consent'
import { resolveAgentPermissionModeSummary } from '../../shared/tui-agent-permissions'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Forflow private deployment policy', () => {
  it('keeps upstream behavior explicit and refuses misspelled profiles', () => {
    expect(getForflowDeploymentProfile({})).toBe('upstream')
    expect(() => getForflowDeploymentProfile({ FORFLOW_DEPLOYMENT_PROFILE: 'cn-prviate' })).toThrow(
      'Invalid'
    )
  })

  it('pins a branded binary to private mode even without launch environment', () => {
    vi.stubGlobal('FORFLOW_BRAND_ENABLED', true)
    expect(getForflowDeploymentProfile({})).toBe('cn-private')
    expect(() => getForflowDeploymentProfile({ FORFLOW_DEPLOYMENT_PROFILE: 'upstream' })).toThrow(
      'require'
    )
    expect(() => assertForflowCloudCapability('sharing', {})).toThrow('已禁用')
  })

  it('applies Chinese and independent workspaces only through the fresh-profile initializer', () => {
    const original = getDefaultPersistedState('/test-home')
    const privateState = applyForflowFreshProfileDefaults(original, '/test-home', {
      FORFLOW_DEPLOYMENT_PROFILE: 'cn-private'
    })
    expect(privateState.settings.uiLanguage).toBe('zh')
    expect(privateState.settings.experimentalNativeChat).toBe(true)
    expect(privateState.settings).not.toHaveProperty('openAgentTabsInChatByDefault')
    expect(privateState.settings).not.toHaveProperty('experimentalStructuredNativeChat')
    expect(privateState.settings.workspaceDir).toBe(join('/test-home', 'Forflow One', 'workspaces'))
    expect(privateState.settings.artifactSharingEnabled).toBe(false)
    expect(privateState.settings.agentSkillSharingEnabled).toBe(false)
    expect(privateState.settings.showMobileButton).toBe(false)
    expect(privateState.settings.minimaxEndpoint).toBe('cn')
    expect(privateState.settings.agentDefaultArgs?.codebuddy).toBe('--permission-mode default')
    expect(privateState.settings.agentDefaultArgs?.['qoder-cn']).toBe('--permission-mode default')
    expect(privateState.settings.agentDefaultEnv?.codebuddy).toMatchObject({
      DISABLE_TELEMETRY: '1',
      DISABLE_ERROR_REPORTING: '1',
      DISABLE_AUTOUPDATER: '1'
    })
    expect(resolveAgentPermissionModeSummary(privateState.settings)).toBe('manual')
    expect(original.settings.uiLanguage).toBe('system')
    expect(applyForflowFreshProfileDefaults(original, '/test-home', {})).toBe(original)
  })

  it('blocks telemetry even if an imported setting opted in', () => {
    vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'cn-private')
    const settings = getDefaultPersistedState('/test-home').settings
    settings.telemetry = { optedIn: true, installId: 'test', existedBeforeTelemetryRelease: false }
    expect(resolveConsent(settings)).toEqual({ effective: 'disabled', reason: 'deployment_policy' })
  })
})
