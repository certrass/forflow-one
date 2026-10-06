import { StringDecoder } from 'node:string_decoder'

/** Keep bracketed multiline paste as one task; only a subsequent Enter submits it. */
export class CompanionInput {
  private draft = ''
  private pending = ''
  private pasted = false
  private readonly decoder = new StringDecoder('utf8')

  constructor(
    private readonly submit: (text: string) => void,
    private readonly cancel: () => void
  ) {}

  seed(value: string): void {
    this.draft = value
    process.stdout.write(value)
  }

  receive(chunk: Buffer): void {
    this.pending += this.decoder.write(chunk)
    while (this.pending) {
      if ('\x1b[200~'.startsWith(this.pending) || '\x1b[201~'.startsWith(this.pending)) {
        if (this.pending.length < 6) {
          return
        }
      }
      if (this.pending.startsWith('\x1b[200~') || this.pending.startsWith('\x1b[201~')) {
        this.pasted = this.pending.startsWith('\x1b[200~')
        this.pending = this.pending.slice(6)
        continue
      }
      if (this.pending.startsWith('\x1b[')) {
        const sequence = /^\[[0-?]*[ -/]*[@-~]/.exec(this.pending.slice(1))
        if (!sequence) {
          return
        }
        this.pending = this.pending.slice(sequence[0].length + 1)
        continue
      }
      const character = String.fromCodePoint(this.pending.codePointAt(0) ?? 0)
      this.pending = this.pending.slice(character.length)
      if (character === '\x03') {
        this.draft = ''
        this.cancel()
        continue
      }
      if (character === '\x04') {
        this.cancel()
        continue
      }
      if ((character === '\r' || character === '\n') && !this.pasted) {
        const text = this.draft.trim()
        this.draft = ''
        process.stdout.write('\r\n')
        if (text) {
          this.submit(text)
        }
      } else if (character === '\x7f' || character === '\b') {
        this.draft = Array.from(this.draft).slice(0, -1).join('')
        process.stdout.write('\b \b')
      } else if (character === '\x15') {
        this.draft = ''
        process.stdout.write('\r\x1b[2K> ')
      } else if (character >= ' ' || character === '\n' || character === '\r') {
        const value = character === '\r' ? '\n' : character
        this.draft += value
        process.stdout.write(value)
      }
    }
  }
}
