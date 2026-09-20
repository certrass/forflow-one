import { describe, expect, it } from 'vitest'
import { readFeishuCliError } from './feishu-cli-error'

describe('Feishu CLI stable error contract', () => {
  it.each([
    ['config', 'not_configured', '第 2 步'],
    ['config', 'invalid_client', '应用凭据无效'],
    ['config', 'invalid_config', '所选应用 ID'],
    ['authentication', 'token_expired', '第 3 步'],
    ['authentication', 'refresh_server_error', '稍后重试'],
    ['authorization', 'missing_scope', '同一应用'],
    ['authorization', 'app_scope_not_applied', '应用管理员'],
    ['authorization', 'app_disabled', '企业管理员'],
    ['authorization', 'permission_denied', '资源负责人'],
    ['network', 'dns', '网络、代理和证书'],
    ['api', 'rate_limit', '过于频繁'],
    ['api', 'not_found', '仍可访问'],
    ['policy', 'challenge_required', '安全验证'],
    ['validation', 'invalid_argument', '命令或参数']
  ])('maps %s/%s without forwarding credential-bearing text', (type, subtype, expected) => {
    const message = readFeishuCliError(
      JSON.stringify({
        ok: false,
        error: {
          type,
          subtype,
          message: 'secret-token',
          hint: 'secret-token',
          extra: 'future-field'
        }
      })
    )
    expect(message).toContain(expected)
    expect(message).not.toContain('secret-token')
  })
  it.each([
    '',
    'secret-token',
    '{"ok":false,"error":{"type":"config"}}',
    '{"ok":true,"error":{"type":"config","subtype":"not_configured"}}',
    '{"ok":false,"error":{"type":"future","subtype":"secret-token"}}'
  ])('uses a safe fallback for an unknown or malformed envelope', (value) => {
    expect(readFeishuCliError(value)).toContain('CLI 执行失败')
    expect(readFeishuCliError(value)).not.toContain('secret-token')
  })
})
