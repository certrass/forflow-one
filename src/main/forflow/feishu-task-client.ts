import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { runProcess } from '../../shared/child-process/run-process'
import {
  feishuProfileSchema,
  feishuQuerySchema,
  feishuIdSchema,
  type FeishuStatus,
  type FeishuConnection,
  type FeishuQuery,
  type FeishuTask,
  type FeishuTasklist,
  type FeishuPage
} from '../../shared/forflow-feishu'
import { resolveCommandOnLocalPath } from '../ipc/command-path-resolver'
import { writeCredentialFileAtomic } from '../integration-credential-file'
import { readFeishuCliError } from './feishu-cli-error'
import {
  cliEnvelopeSchema,
  pageSchema,
  taskResultSchema,
  tasklistSchema,
  readFeishuIdentity,
  readFeishuTask
} from './feishu-cli-contract'

const bindingSchema = z.object({
  appId: feishuProfileSchema,
  userId: z.string().min(1),
  userName: z.string()
})
type Dependencies = { run: typeof runProcess; resolve: typeof resolveCommandOnLocalPath }

export class FeishuTaskClient {
  private generation = 0
  private readonly file: string
  constructor(
    private readonly directory: string,
    private readonly deps: Dependencies = {
      run: runProcess,
      resolve: resolveCommandOnLocalPath
    }
  ) {
    this.file = join(directory, 'forflow-feishu-connection.json')
  }

  private binding(): FeishuConnection | null {
    try {
      return bindingSchema.parse(JSON.parse(readFileSync(this.file, 'utf8')))
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return null
      }
      throw new Error('无法读取飞书连接配置，请断开后重新连接。')
    }
  }

  async status(): Promise<FeishuStatus> {
    return { installed: Boolean(await this.deps.resolve('lark-cli')), connection: this.binding() }
  }

  async connect(appId?: string): Promise<FeishuStatus> {
    const profile = appId ? feishuProfileSchema.parse(appId) : undefined
    const generation = ++this.generation
    const connection = await this.identity(profile)
    if (generation !== this.generation) {
      throw new Error('飞书连接已变更，请重试。')
    }
    mkdirSync(this.directory, { recursive: true, mode: 0o700 })
    writeCredentialFileAtomic(this.file, Buffer.from(JSON.stringify(connection)))
    return { installed: true, connection }
  }

  disconnect(): void {
    ++this.generation
    rmSync(this.file, { force: true })
  }

  private async command(args: string[]): Promise<unknown> {
    const program = await this.deps.resolve('lark-cli')
    if (!program) {
      throw new Error('未找到官方飞书 CLI，请先按连接指引安装。')
    }
    let result
    try {
      result = await this.deps.run({
        program,
        args,
        cwd: this.directory,
        timeoutMs: 30_000,
        maxOutputBytes: 2 * 1024 * 1024
      })
    } catch {
      throw new Error('无法启动飞书 CLI，请检查安装路径和执行权限。')
    }
    if (result.timedOut) {
      throw new Error('飞书读取超时，请检查网络后重试。')
    }
    if (result.outputTruncated) {
      throw new Error('飞书返回内容超过读取上限，请缩小读取范围后重试。')
    }
    if (result.code !== 0) {
      throw new Error(readFeishuCliError(result.stderr))
    }
    try {
      return JSON.parse(result.stdout)
    } catch {
      throw new Error('飞书 CLI 返回格式无法识别，请检查版本。')
    }
  }

  private identity(appId?: string): Promise<FeishuConnection> {
    return this.command([...(appId ? ['--profile', appId] : []), 'auth', 'status', '--json']).then(
      readFeishuIdentity
    )
  }

  private async read(resource: string, operation: string, params: object): Promise<unknown> {
    const binding = this.binding()
    if (!binding) {
      throw new Error('请先连接飞书。')
    }
    const generation = this.generation
    const assertAccount = async (): Promise<void> => {
      const current = await this.identity(binding.appId)
      if (
        generation !== this.generation ||
        current.userId !== binding.userId ||
        current.appId !== binding.appId
      ) {
        throw new Error('飞书账号或连接已变更，请重新连接后读取。')
      }
    }
    await assertAccount()
    const result = await this.command([
      '--profile',
      binding.appId,
      'task',
      resource,
      operation,
      '--params',
      JSON.stringify(params),
      '--as',
      'user',
      '--format',
      'json'
    ])
    await assertAccount()
    const parsed = cliEnvelopeSchema.safeParse(result)
    if (!parsed.success) {
      throw new Error('飞书未返回个人任务数据，请检查授权或更新 CLI。')
    }
    return parsed.data.data
  }

  private async page<T>(
    resource: string,
    operation: string,
    params: object,
    item: (value: unknown) => T
  ): Promise<FeishuPage<T>> {
    const value = await this.read(resource, operation, params)
    try {
      const page = pageSchema.parse(value)
      return {
        items: page.items.map(item),
        nextPageToken: page.has_more ? (page.page_token ?? null) : null,
        fetchedAt: new Date().toISOString()
      }
    } catch {
      throw new Error('飞书任务数据格式无法识别，请检查 CLI 版本。')
    }
  }

  tasklists(pageToken?: string): Promise<FeishuPage<FeishuTasklist>> {
    const token = z.string().max(4096).optional().parse(pageToken)
    return this.page(
      'tasklists',
      'list',
      { page_size: 50, ...(token ? { page_token: token } : {}) },
      (value) => {
        const tasklist = tasklistSchema.parse(value)
        return { id: tasklist.guid, name: tasklist.name }
      }
    )
  }

  tasks(input: FeishuQuery): Promise<FeishuPage<FeishuTask>> {
    const query = feishuQuerySchema.parse(input)
    return this.page(
      query.tasklistId ? 'tasklists' : 'tasks',
      query.tasklistId ? 'tasks' : 'list',
      {
        ...(query.tasklistId ? { tasklist_guid: query.tasklistId } : { type: 'my_tasks' }),
        completed: query.completed,
        page_size: 50,
        ...(query.pageToken ? { page_token: query.pageToken } : {})
      },
      readFeishuTask
    )
  }

  async task(id: string): Promise<FeishuTask> {
    const value = await this.read('tasks', 'get', { task_guid: feishuIdSchema.parse(id) })
    try {
      const task = readFeishuTask(taskResultSchema.parse(value).task)
      if (task.id !== id) {
        throw new Error('任务 ID 不匹配')
      }
      return task
    } catch {
      throw new Error('飞书任务详情格式无法识别，请检查 CLI 版本。')
    }
  }
}
