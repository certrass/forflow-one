import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompanionInput } from './companion-input'

afterEach(() => vi.restoreAllMocks())

describe('companion task input', () => {
  it('does not submit a multiline paste until the following Enter', () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const submit = vi.fn()
    const input = new CompanionInput(submit, vi.fn())
    input.receive(Buffer.from('\x1b[20'))
    input.receive(Buffer.from('0~第一行\n第二行\n\x1b[201~'))
    expect(submit).not.toHaveBeenCalled()
    input.receive(Buffer.from('\r'))
    expect(submit).toHaveBeenCalledExactlyOnceWith('第一行\n第二行')
  })

  it('keeps a launch draft unsent and clears it before native-chat replacement', () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const submit = vi.fn()
    const input = new CompanionInput(submit, vi.fn())
    input.seed('旧草稿')
    expect(submit).not.toHaveBeenCalled()
    input.receive(Buffer.from('\x15\x1b[200~更新后的任务 $(literal) `text`\x1b[201~\r'))
    expect(submit).toHaveBeenCalledExactlyOnceWith('更新后的任务 $(literal) `text`')
  })

  it('does not turn arrow keys into task text', () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const submit = vi.fn()
    const input = new CompanionInput(submit, vi.fn())
    input.receive(Buffer.from('review\x1b['))
    input.receive(Buffer.from('A\r'))
    expect(submit).toHaveBeenCalledExactlyOnceWith('review')
  })

  it('preserves UTF-8 across chunk boundaries and cancellation sends nothing', () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const submit = vi.fn(),
      cancel = vi.fn()
    const input = new CompanionInput(submit, cancel)
    const bytes = Buffer.from('你好')
    input.receive(bytes.subarray(0, 2))
    input.receive(bytes.subarray(2))
    input.receive(Buffer.from('\r'))
    expect(submit).toHaveBeenCalledExactlyOnceWith('你好')
    input.seed('不要发送')
    input.receive(Buffer.from('\x03'))
    expect(cancel).toHaveBeenCalledOnce()
    expect(submit).toHaveBeenCalledTimes(1)
  })
})
