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
      'forflow aily',
      'forflow workbuddy',
      'qodercn'
    ])
    expect(connections[0].agentId).toBeNull()
    expect(connections[1].agentId).toBe('aily')
    expect(connections[2].agentId).toBe('workbuddy')
    expect(connections[3].agentId).toBe('qoder-cn')
    expect(AI_VAULT_AGENTS).toContain('codebuddy')
    expect(AI_VAULT_AGENTS).not.toContain('qoder-cn')
    expect(AI_VAULT_AGENTS).not.toContain(null)
  })

  it('uses execution-host detection and preserves unknown and failed states', () => {
    expect(getDomesticCliDetectionLabel(true, false)).toContain('已找到')
    expect(getDomesticCliDetectionLabel(false, false)).toContain('需要设置')
    expect(getDomesticCliDetectionLabel(null, false)).toContain('正在检查')
    expect(getDomesticCliDetectionLabel(true, true)).toBe('检查失败')
    const html = renderToStaticMarkup(
      createElement(ForflowDomesticConnections, {
        detectedIds: new Set(['workbuddy']),
        detectionFailed: false,
        hostName: '企业内网主机'
      })
    )
    expect(html).toContain('连接位置：企业内网主机')
    expect(html).toContain('已找到连接工具')
    expect(html).toContain('需要设置')
    expect(html).not.toContain('历史暂未接入')
    expect(html).toContain('接入豆包模型')
    expect(html).not.toContain('checkbox')
  })

  it('makes user product names searchable and links to the domestic CLI sources', () => {
    const entries = getAgentsPaneSearchEntries()
    const keywords = entries.flatMap((entry) => entry.keywords).join(' ')
    for (const name of ['豆包', 'WorkBuddy', 'qodercn', 'codebuddy']) {
      expect(keywords).toContain(name)
    }
    expect(getForflowDomesticConnections().map((connection) => connection.documentation)).toEqual([
      'https://github.com/volcengine/ark-cli',
      'https://github.com/larksuite/cli',
      'https://www.workbuddy.cn/',
      'https://docs.qoder.cn/cli/quickstart'
    ])
  })
})
