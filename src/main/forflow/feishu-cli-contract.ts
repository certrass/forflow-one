import { z } from 'zod'
import {
  safeFeishuTaskUrl,
  type FeishuConnection,
  type FeishuTask
} from '../../shared/forflow-feishu'

const cliUserSchema = z.object({
  status: z.string(),
  openId: z.string().min(1),
  userName: z.string().optional(),
  scope: z.string().default('')
})
const cliStatusSchema = z.object({
  appId: z.string().regex(/^cli_[a-zA-Z0-9]+$/),
  brand: z.literal('feishu'),
  identities: z.object({ user: cliUserSchema })
})

export function readFeishuAccount(value: unknown): {
  connection: FeishuConnection
  scopes: Set<string>
} {
  const parsed = cliStatusSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error('尚未找到飞书个人授权，请按连接指引配置并登录。')
  }
  const user = parsed.data.identities.user
  const scopes = new Set(user.scope.split(/\s+/))
  if (!['ready', 'needs_refresh'].includes(user.status)) {
    throw new Error('飞书个人登录已失效，请重新授权后连接。')
  }
  return {
    connection: {
      appId: parsed.data.appId,
      userId: user.openId,
      userName: user.userName || '飞书用户'
    },
    scopes
  }
}

export function readFeishuIdentity(value: unknown): FeishuConnection {
  const { connection, scopes } = readFeishuAccount(value)
  if (
    !['task:task:read', 'task:task:write'].some((scope) => scopes.has(scope)) ||
    !['task:tasklist:read', 'task:tasklist:write'].some((scope) => scopes.has(scope))
  ) {
    throw new Error('飞书授权缺少任务或任务清单读取权限，请按连接指引补充授权。')
  }
  return connection
}

const taskSchema = z.object({
  guid: z.string().min(1),
  summary: z.string().default('未命名任务'),
  description: z.string().default(''),
  url: z.string().optional(),
  completed_at: z.string().optional(),
  status: z.string().optional(),
  updated_at: z.string().optional(),
  due: z.object({ timestamp: z.string().optional() }).nullish()
})
export const tasklistSchema = z.object({ guid: z.string().min(1), name: z.string() })
export const pageSchema = z
  .object({
    items: z.array(z.unknown()).default([]),
    has_more: z.boolean().default(false),
    page_token: z.string().optional()
  })
  .refine((value) => !value.has_more || Boolean(value.page_token), '缺少分页游标')
export const taskResultSchema = z.object({ task: z.unknown() })
export const cliEnvelopeSchema = z.object({
  ok: z.literal(true),
  identity: z.literal('user'),
  data: z.unknown()
})

export function readFeishuTask(value: unknown): FeishuTask {
  const task = taskSchema.parse(value)
  return {
    id: task.guid,
    title: task.summary,
    description: task.description,
    url: safeFeishuTaskUrl(task.url),
    completed: task.status === 'done' || Boolean(task.completed_at && task.completed_at !== '0'),
    updatedAt: task.updated_at || null,
    dueAt: task.due?.timestamp || null
  }
}
