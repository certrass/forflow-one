import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { AI_VAULT_AGENTS } from '../../../../shared/ai-vault-types'
import { ForflowDomesticConnections } from './ForflowDomesticConnections'
import { getAgentsPaneSearchEntries } from './agents-search'
import {
  getDomesticCliDetectionLabel,
  getForflowDomesticConnections
} from '@/lib/forflow-domestic-connections'

describe('Forflow domestic connections', () => {
  beforeEach(async () => {
    vi.stubGlobal('FORFLOW_BRAND_ENABLED', true)
    await i18n.changeLanguage('zh')
  })
  afterEach(async () => {
    vi.unstubAllGlobals()
    await i18n.changeLanguage('en')
  })

  it('keeps model tools and unsupported history out of resumable history filters', () => {
    const connections = getForflowDomesticConnections()
    expect(connections.map((connection) => connection.command)).toEqual([
      'arkcli',
      'codebuddy',
      'qodercn'
    ])
    expect(connections[0].agentId).toBeNull()
    expect(connections[1].agentId).toBe('codebuddy')
    expect(connections[2].agentId).toBe('qoder-cn')
    expect(AI_VAULT_AGENTS).toContain('codebuddy')
    expect(AI_VAULT_AGENTS).not.toContain('qoder-cn')
    expect(AI_VAULT_AGENTS).not.toContain(null)
  })

  it('uses execution-host detection and preserves unknown and failed states', () => {
    expect(getDomesticCliDetectionLabel(true, false)).toContain('已检测到')
    expect(getDomesticCliDetectionLabel(false, false)).toContain('尚未检测到')
    expect(getDomesticCliDetectionLabel(null, false)).toContain('正在检测')
    expect(getDomesticCliDetectionLabel(true, true)).toBe('主机检测失败')
    const html = renderToStaticMarkup(
      createElement(ForflowDomesticConnections, {
        detectedIds: new Set(['codebuddy']),
        detectionFailed: false,
        hostName: '企业内网主机'
      })
    )
    expect(html).toContain('CLI 检测主机：企业内网主机')
    expect(html).toContain('已检测到 CLI；登录状态由 CLI 确认')
    expect(html).toContain('此主机尚未检测到 CLI')
    expect(html).toContain('历史暂未接入')
    expect(html).toContain('豆包／火山方舟')
    expect(html).not.toContain('checkbox')
  })

  it('makes user product names searchable and links to the domestic CLI sources', () => {
    const entries = getAgentsPaneSearchEntries()
    const keywords = entries.flatMap((entry) => entry.keywords).join(' ')
    for (const name of ['豆包', 'WorkBuddy', 'QoderWork', 'qodercn', 'codebuddy']) {
      expect(keywords).toContain(name)
    }
    expect(getForflowDomesticConnections().map((connection) => connection.documentation)).toEqual([
      'https://github.com/volcengine/ark-cli',
      'https://www.codebuddy.cn/docs/cli/installation',
      'https://docs.qoder.cn/cli/quickstart'
    ])
  })
})
