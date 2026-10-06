import { createInterface } from 'node:readline'
import { z } from 'zod'
import { spawnProcess } from '../../shared/child-process/run-process'
import { forceTerminateProcessTree } from '../../shared/child-process/process-tree-termination'

const frameSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z.object({ message: z.string() }).passthrough().optional()
})

export class WorkBuddyConnection {
  private readonly child
  private sequence = 0
  private readonly pending = new Map<
    number,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timer: NodeJS.Timeout
    }
  >()
  private closed = false

  constructor(
    program: string,
    cwd: string,
    readonly receive: (method: string, params: unknown, id?: string | number) => void
  ) {
    this.child = spawnProcess({
      program,
      args: ['--acp', '--permission-mode', 'default'],
      cwd,
      env: { ...process.env, DISABLE_AUTOUPDATER: '1' },
      detached: process.platform !== 'win32'
    })
    const lines = createInterface({ input: this.child.stdout })
    lines.on('line', (line) => {
      if (Buffer.byteLength(line) > 2 * 1024 * 1024) {
        this.fail(new Error('WorkBuddy 返回内容过长。'))
        return
      }
      let parsed
      try {
        parsed = frameSchema.safeParse(JSON.parse(line))
      } catch {
        return
      }
      if (!parsed.success) {
        return
      }
      const frame = parsed.data
      if (frame.method) {
        this.receive(frame.method, frame.params, frame.id)
        return
      }
      if (typeof frame.id !== 'number') {
        return
      }
      const waiting = this.pending.get(frame.id)
      if (!waiting) {
        return
      }
      this.pending.delete(frame.id)
      clearTimeout(waiting.timer)
      if (frame.error) {
        waiting.reject(new Error(frame.error.message))
      } else {
        waiting.resolve(frame.result)
      }
    })
    this.child.stderr.on('data', () => {})
    this.child.stdout.on('error', (error) => this.fail(error))
    this.child.stdin.on('error', (error) => this.fail(error))
    this.child.stderr.on('error', (error) => this.fail(error))
    this.child.on('error', (error) => this.fail(error))
    this.child.on('close', () => {
      lines.close()
      this.closed = true
      this.fail(new Error('WorkBuddy CLI 已退出。'))
    })
  }

  private fail(error: Error): void {
    for (const value of this.pending.values()) {
      clearTimeout(value.timer)
      value.reject(error)
    }
    this.pending.clear()
  }

  request(method: string, params: unknown, timeout = 180_000): Promise<unknown> {
    if (this.closed) {
      return Promise.reject(new Error('WorkBuddy CLI 已退出。'))
    }
    const id = ++this.sequence
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('WorkBuddy 响应超时。'))
      }, timeout)
      this.pending.set(id, { resolve, reject, timer })
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    })
  }

  notify(method: string, params: unknown): void {
    if (!this.closed) {
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`)
    }
  }

  answer(id: string | number, result: unknown): void {
    if (!this.closed) {
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`)
    }
  }

  refuse(id: string | number): void {
    if (!this.closed) {
      this.child.stdin.write(
        `${JSON.stringify({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: 'This client does not implement this operation.' }
        })}\n`
      )
    }
  }

  async close(): Promise<void> {
    this.fail(new Error('会话已关闭。'))
    if (!this.closed) {
      await forceTerminateProcessTree(this.child)
    }
  }
}
