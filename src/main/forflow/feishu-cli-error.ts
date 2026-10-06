import { z } from 'zod'

const errorEnvelope = z.object({
  ok: z.literal(false),
  error: z.object({ type: z.string(), subtype: z.string() })
})

export function readFeishuCliError(stderr: string, domain: 'tasks' | 'messages' = 'tasks'): string {
  const fallback =
    domain === 'messages'
      ? '飞书暂时无法完成这次操作，请稍后重试。'
      : '飞书连接未完成，请重试或查看连接步骤。'
  let value: unknown
  try {
    value = JSON.parse(stderr)
  } catch {
    return fallback
  }
  const parsed = errorEnvelope.safeParse(value)
  if (!parsed.success) {
    return fallback
  }
  // Only stable error identifiers select copy; CLI messages and hints may contain credentials.
  const { type, subtype } = parsed.data.error
  if (domain === 'messages' && type === 'authorization') {
    return '飞书授权未包含会话访问或发送权限，请在飞书 CLI 中补充消息授权后重试。'
  }
  if (domain === 'messages' && type === 'authentication') {
    return '飞书登录已失效，请在飞书 CLI 中重新登录。'
  }
  if (domain === 'messages' && type === 'config' && subtype === 'not_configured') {
    return '请先在终端运行 lark-cli config init 完成配置，再运行 lark-cli auth login 登录飞书。'
  }
  if (domain === 'messages' && type === 'api' && subtype !== 'rate_limit') {
    return '飞书暂时无法同步这段对话，请稍后刷新。'
  }
  switch (type) {
    case 'config':
      if (subtype === 'not_configured') {
        return '尚未配置飞书应用。请展开“首次连接”，完成应用选择和授权。'
      }
      return subtype === 'invalid_client'
        ? '飞书应用凭据无效，请检查 App ID 和 App Secret 后重新配置应用。'
        : '飞书应用配置无法读取，请检查所选应用 ID 和 CLI 配置后重试。'
    case 'authentication':
      return subtype === 'refresh_server_error'
        ? '飞书暂时无法刷新个人授权，请稍后重试。'
        : '飞书登录已失效，请重新登录并授权后连接。'
    case 'authorization':
      if (subtype === 'app_scope_not_applied') {
        return '飞书应用尚未开通任务或任务清单权限，请联系应用管理员在开放平台配置并发布后重试。'
      }
      if (['app_unavailable', 'app_disabled'].includes(subtype)) {
        return '飞书应用不可用或已停用，请联系企业管理员确认应用状态和可用范围。'
      }
      return subtype === 'permission_denied'
        ? '当前飞书账号无权访问这项任务或清单，请联系资源负责人授予访问权限。'
        : '飞书缺少任务读取权限，请为当前应用重新授权。'
    case 'network':
      return '暂时无法连接飞书，请检查网络后重试。'
    case 'api':
      return subtype === 'rate_limit'
        ? '飞书请求过于频繁，请稍后重试。'
        : '飞书接口未能完成读取，请稍后重试，并检查任务或清单是否仍可访问。'
    case 'policy':
      return '飞书安全策略阻止了本次访问，请按企业要求完成安全验证或联系管理员。'
    case 'validation':
      return '飞书 CLI 不支持当前命令或参数，请检查 CLI 版本与所选应用配置。'
    default:
      return fallback
  }
}
