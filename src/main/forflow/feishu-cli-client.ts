import { runProcess } from '../../shared/child-process/run-process'
import { resolveCommandOnLocalPath } from '../ipc/command-path-resolver'
import { readFeishuCliError } from './feishu-cli-error'

export type FeishuCliDependencies = {
  run: typeof runProcess
  resolve: typeof resolveCommandOnLocalPath
}

export class FeishuCliClient {
  constructor(
    private readonly directory: string,
    private readonly deps: FeishuCliDependencies = {
      run: runProcess,
      resolve: resolveCommandOnLocalPath
    }
  ) {}

  async installed(): Promise<boolean> {
    return Boolean(await this.deps.resolve('lark-cli'))
  }

  async command(args: string[], domain: 'tasks' | 'messages' = 'tasks'): Promise<unknown> {
    const program = await this.deps.resolve('lark-cli')
    if (!program) {
      throw new Error(
        domain === 'messages'
          ? '未找到飞书 CLI，请先安装并登录。'
          : '未找到官方飞书 CLI，请先按连接指引安装。'
      )
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
      throw new Error(
        domain === 'messages'
          ? '飞书请求超时，请刷新对话确认结果后重试。'
          : '飞书读取超时，请检查网络后重试。'
      )
    }
    if (result.outputTruncated) {
      throw new Error('飞书返回内容超过读取上限，请缩小读取范围后重试。')
    }
    if (result.code !== 0) {
      throw new Error(readFeishuCliError(result.stderr, domain))
    }
    try {
      return JSON.parse(result.stdout)
    } catch {
      throw new Error('飞书 CLI 返回格式无法识别，请检查版本。')
    }
  }
}
