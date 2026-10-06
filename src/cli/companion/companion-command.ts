import { parseArgs } from 'node:util'
import { mkdirSync } from 'node:fs'
import { companionDirectory } from '../../shared/forflow-companion-paths'
import type { CompanionAgent } from '../../shared/forflow-companion'
import { AilyConversation } from './aily-conversation'
import { WorkBuddyConversation } from './workbuddy-conversation'
import { CompanionInput } from './companion-input'

export async function runCompanionCommand(
  agent: CompanionAgent,
  argv: string[],
  cwd: string
): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      resume: { type: 'string' },
      prefill: { type: 'string' },
      connect: { type: 'string' }
    }
  })
  if (values.help) {
    process.stdout.write(
      `forflow ${agent} [--resume <会话编号>] [--prefill <草稿>] [-- <任务>]\n` +
        `在当前工作区启动会话。Enter 发送，Ctrl+C 中断，/exit 退出。\n${
          agent === 'aily'
            ? '使用官方 lark-cli 的个人登录；--connect <飞书会话编号> 选择伙伴。\n'
            : '使用本机 WorkBuddy 的 CLI 和登录。\n'
        }`
    )
    return
  }
  if (values.connect && agent !== 'aily') {
    throw new Error('--connect 仅用于选择飞书伙伴。')
  }
  if (values.prefill && positionals.length) {
    throw new Error('草稿与立即发送的任务只能选择一个。')
  }
  mkdirSync(companionDirectory(agent), { recursive: true, mode: 0o700 })
  process.title = `forflow-${agent}`
  const conversation = agent === 'aily' ? new AilyConversation() : new WorkBuddyConversation(cwd)
  if (conversation instanceof AilyConversation && values.connect) {
    await conversation.client.connect(values.connect)
  }
  let journal
  try {
    journal = await conversation.open(values.resume)
  } catch (error) {
    await conversation.close()
    throw error
  }
  const pending: string[] = []
  let busy = false
  let closing = false
  let complete: () => void = () => {}
  const completed = new Promise<void>((resolve) => {
    complete = resolve
  })
  const close = async (): Promise<void> => {
    if (closing) {
      return
    }
    closing = true
    process.stdin.off('data', onData)
    process.stdin.off('end', onEnd)
    process.stdin.pause()
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false)
    }
    process.stdin.destroy()
    process.stdout.write('\x1b[?2004l\n')
    try {
      await conversation.close()
    } finally {
      complete()
    }
  }
  const submit = async (text: string): Promise<void> => {
    if (conversation instanceof WorkBuddyConversation && conversation.answer(text)) {
      return
    }
    if (text === '/exit') {
      await close()
      return
    }
    if (busy) {
      pending.push(text)
      process.stdout.write('消息已排队，将在当前任务结束后发送。\n')
      return
    }
    busy = true
    try {
      await (text === '/refresh' && conversation instanceof AilyConversation
        ? conversation.refreshHistory()
        : conversation.send(text))
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送失败，请重试。'
      journal.message('system', message)
      journal.status('done')
      process.stdout.write(`${message}\n`)
    } finally {
      busy = false
      if (!closing) {
        const next = pending.shift()
        if (next) {
          void submit(next)
        } else {
          process.stdout.write('> ')
        }
      }
    }
  }
  const input = new CompanionInput(
    (text) => {
      void submit(text)
    },
    () => {
      if (busy) {
        conversation.cancel()
      } else {
        void close()
      }
    }
  )
  const onData = (chunk: Buffer): void => input.receive(chunk)
  const onEnd = (): void => {
    void close()
  }
  const onSignal = (): void => {
    void close()
  }
  for (const signal of ['SIGTERM', 'SIGHUP', 'SIGINT'] as const) {
    process.on(signal, onSignal)
  }
  process.stdin.on('data', onData)
  process.stdin.on('end', onEnd)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }
  process.stdin.resume()
  process.stdout.write('\x1b[?2004h> ')
  if (values.prefill) {
    input.seed(values.prefill)
  }
  if (positionals.length) {
    void submit(positionals.join(' '))
  }
  await completed
  for (const signal of ['SIGTERM', 'SIGHUP', 'SIGINT'] as const) {
    process.off(signal, onSignal)
  }
}
