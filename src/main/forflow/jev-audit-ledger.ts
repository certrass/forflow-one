import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import { jevReceiptSchema, type JevReceipt } from '../../shared/jev-audit-types'
import { writeFileAtomically } from '../codex-accounts/fs-utils'

const ledgerSchema = z.object({
  schemaVersion: z.literal(1),
  receipts: z.array(jevReceiptSchema).max(1000)
})
const MAX_BYTES = 8 * 1024 * 1024

export class JevAuditLedger {
  constructor(private readonly file: string) {}

  all(): JevReceipt[] {
    try {
      if (statSync(this.file).size > MAX_BYTES) {
        throw new Error('Jev 调用记录已达到容量限制。')
      }
      return ledgerSchema.parse(JSON.parse(readFileSync(this.file, 'utf8'))).receipts
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return []
      }
      throw new Error('无法读取 Jev 调用记录，请保留文件并检查本机存储。')
    }
  }

  put(receipt: JevReceipt): void {
    const receipts = this.all()
    const index = receipts.findIndex((entry) => entry.id === receipt.id)
    if (index === -1) {
      receipts.push(receipt)
    } else {
      receipts[index] = receipt
    }
    const content = JSON.stringify(ledgerSchema.parse({ schemaVersion: 1, receipts }))
    if (Buffer.byteLength(content) > MAX_BYTES) {
      throw new Error('Jev 调用记录已达到容量限制。')
    }
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 })
    writeFileAtomically(this.file, content, { mode: 0o600 })
  }
}
