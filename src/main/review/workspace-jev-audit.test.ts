import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JEV_MODEL, type JevPrepareInput } from '../../shared/jev-audit-types'
import { setSecretStore, _resetSecretStoreForTests } from '../../shared/secret-store'
import type {
  WorkspaceReviewQuery,
  WorkspaceReviewTarget
} from '../../shared/workspace-review-types'
import { CodexReviewStore } from '../codex-usage/codex-review-store'
import type { readCodexReviewEvidence } from '../codex-usage/codex-review-evidence'
import { JevAuditService } from '../forflow/jev-audit-service'
import { JevAuditLedger } from '../forflow/jev-audit-ledger'
import { ForflowModelAccountStorage } from '../forflow/model-account-storage'
import { readWorkspaceReviewInput } from './workspace-review-input'
import { WorkspaceReviewSource } from './workspace-review-source'
import { inspectWorkspaceText } from './workspace-sensitive-signals'

const dirs: string[] = []
afterEach(async () => {
  _resetSecretStoreForTests()
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })))
})

function response(includeClaim = false) {
  return new Response(
    JSON.stringify({
      model: JEV_MODEL,
      answers: {
        outcome: {
          type: 'choice',
          choice: 'unknown',
          confidence: 1,
          probabilities: { attention: 0, none: 0, unknown: 1 }
        },
        evidence: {
          type: 'choice',
          choice: 'missing',
          confidence: 1,
          probabilities: { sufficient: 0, missing: 1, unknown: 0 }
        },
        ...(includeClaim
          ? {
              claim: {
                type: 'choice',
                choice: 'unknown',
                confidence: 1,
                probabilities: { supported: 0, conflict: 0, unknown: 1 }
              }
            }
          : {})
      },
      usage: { input_tokens: 100, output_tokens: 0 }
    }),
    { headers: { 'content-type': 'application/json' } }
  )
}

async function fixture(text = '仅在所选代码范围核对异常，不作完整项目结论。') {
  const dir = await mkdtemp(join(tmpdir(), 'workspace-jev-audit-'))
  dirs.push(dir)
  const rootPath = join(dir, 'workspace')
  await mkdir(rootPath)
  const path = join(rootPath, 'selected.txt')
  await writeFile(path, text)
  setSecretStore({
    isEncryptionAvailable: () => true,
    describeProtectionGap: () => null,
    encryptString: (value) => Buffer.from(Buffer.from(value).map((byte) => byte ^ 77)),
    decryptString: (bytes) => Buffer.from(bytes.map((byte) => byte ^ 77)).toString('utf8')
  })
  const accounts = new ForflowModelAccountStorage(dir)
  accounts.save({ provider: 'jev', model: JEV_MODEL, apiKey: 'synthetic-account-credential' })
  const target: WorkspaceReviewTarget = {
    id: 'workspace-1',
    selector: 'folder:workspace-1',
    kind: 'folder',
    hostId: 'local',
    name: 'Synthetic workspace',
    rootPath,
    projectId: null,
    available: true,
    unavailableReason: null
  }
  const source = new WorkspaceReviewSource({
    resolveTarget: async () => target,
    authorizePath: async (filePath) => realpath(filePath),
    readGitMetadata: async () => ({
      status: 'not_applicable',
      head: null,
      branch: null,
      changes: [],
      reason: null
    }),
    inspectText: inspectWorkspaceText
  })
  const query: WorkspaceReviewQuery = {
    workspaceId: target.id,
    focus: '检查所选材料是否需要进一步核实',
    selection: {
      files: [{ path: 'selected.txt', kind: 'document' }],
      sessionIds: [],
      policyReference: '',
      applicability: 'unconfirmed',
      applicabilityReason: ''
    }
  }
  const usage = {
    getReviewSource: vi.fn(async () => {
      throw new Error('usage scan disabled')
    })
  }
  const reviews = new CodexReviewStore(join(dir, 'workspace-reviews.json'), async (input) => {
    if (!('workspaceId' in input)) {
      throw new Error('workspace review required')
    }
    return readWorkspaceReviewInput(input, source, usage)
  })
  const review = await reviews.open(query)
  const ledgerPath = join(dir, 'jev.json')
  const ledger = new JevAuditLedger(ledgerPath)
  const send = vi.fn(async (_url: string, _init?: RequestInit) => response())
  const reader = vi.fn<typeof readCodexReviewEvidence>(async (current, versionId, key, part) => {
    const workspace = current.versions.find((version) => version.id === versionId)?.workspace
    if (!workspace || part === 'result') {
      throw new Error('workspace file evidence expected')
    }
    return source.readEvidence(workspace, key)
  })
  let enabled = false
  const service = new JevAuditService(reviews, accounts, ledger, send, () => enabled, reader)
  const version = review.versions[0]!
  const input: JevPrepareInput = {
    reviewId: review.id,
    versionId: version.id,
    evidenceKey: version.workspace!.files[0]!.evidenceKey,
    claim: ''
  }
  return {
    dir,
    path,
    query,
    source,
    usage,
    reviews,
    review,
    ledger,
    ledgerPath,
    send,
    reader,
    service,
    input,
    enable: () => {
      enabled = true
    }
  }
}

describe('workspace Jev audit input boundary', () => {
  it('previews verified file evidence with Codex scanning disabled and makes no external call', async () => {
    const f = await fixture()
    const preview = await f.service.prepare(f.input)
    expect(JSON.parse(preview.body).state.record).toContain('仅在所选代码范围')
    expect(JSON.parse(preview.body).state.partial).toBe(true)
    expect(f.reader).toHaveBeenCalledTimes(1)
    expect(f.usage.getReviewSource).not.toHaveBeenCalled()
    expect(f.send).not.toHaveBeenCalled()
    expect(f.ledger.all()).toEqual([])
  })

  it('refuses an unfamiliar file key before reading or sending content', async () => {
    const f = await fixture()
    await expect(f.service.prepare({ ...f.input, evidenceKey: 'foreign-file' })).rejects.toThrow()
    expect(f.reader).not.toHaveBeenCalled()
    expect(f.send).not.toHaveBeenCalled()
    f.enable()
    await expect(f.service.prepare({ ...f.input, evidenceKey: 'foreign-file' })).rejects.toThrow(
      '不属于当前审阅版本'
    )
    expect(f.reader).not.toHaveBeenCalled()
    expect(f.send).not.toHaveBeenCalled()
  })

  it('rejects a file changed before prepare instead of attributing its new content to the old version', async () => {
    const f = await fixture()
    await writeFile(f.path, 'new source after snapshot')
    await expect(f.service.prepare(f.input)).rejects.toThrow('原始文件已变化')
    expect(f.send).not.toHaveBeenCalled()
    expect(f.ledger.all()).toEqual([])
  })

  it('revalidates the file at run even when both secret values produce the same redacted preview', async () => {
    const f = await fixture('API_KEY=sk-aaaaaaaaaaaaaaaaaaaaaaaa\n')
    const preview = await f.service.prepare(f.input)
    await writeFile(f.path, 'API_KEY=sk-bbbbbbbbbbbbbbbbbbbbbbbb\n')
    await expect(f.service.run(preview)).rejects.toThrow('原始文件已变化')
    expect(f.send).not.toHaveBeenCalled()
    expect(f.ledger.all()).toEqual([])
  })

  it('keeps partial true for workspace files and sends only after the explicit run', async () => {
    const f = await fixture()
    const preview = await f.service.prepare(f.input)
    expect(f.send).not.toHaveBeenCalled()
    const receipt = await f.service.run(preview)
    expect(receipt.status).toBe('completed')
    expect(f.send).toHaveBeenCalledTimes(1)
    expect(f.send.mock.calls[0]?.[1]?.body).toBe(preview.body)
    expect(JSON.parse(preview.body).state.partial).toBe(true)
    await f.service.run(preview)
    expect(f.send).toHaveBeenCalledTimes(1)
  })

  it('removes credentials and personal information before preview, external send and persisted receipts', async () => {
    const secret = 'sk-abcdefghijklmno123456789'
    const phone = '13800138000'
    const identity = '110101199001011234'
    const email = 'synthetic.person@example.test'
    const f = await fixture(
      `API_KEY=${secret}\n联系电话：${phone}\n证件号码：${identity}\nEmail: ${email}\n`
    )
    const preview = await f.service.prepare(f.input)
    const receipt = await f.service.run(preview)
    expect(receipt.status).toBe('completed')
    const body = f.send.mock.calls[0]?.[1]?.body
    expect(typeof body).toBe('string')
    const receiptText = await readFile(f.ledgerPath, 'utf8')
    const reviewText = await readFile(join(f.dir, 'workspace-reviews.json'), 'utf8')
    for (const original of [secret, phone, identity, email]) {
      expect(preview.body).not.toContain(original)
      expect(body).not.toContain(original)
      expect(receiptText).not.toContain(original)
      expect(reviewText).not.toContain(original)
    }
    expect(preview.body).toContain('redacted')
  })

  it('omits an explicitly confidential file as a whole instead of sending its non-credential paragraphs', async () => {
    const text =
      '密级：保密\n这是仅用于测试的商业材料：项目代号 synthetic-project-moon，计划金额 12345。\n'
    const f = await fixture(text)
    const preview = await f.service.prepare(f.input)
    expect(JSON.parse(preview.body).state.record).toBe(
      '[Confidential document omitted from review preview and external requests]'
    )
    expect(preview.body).not.toContain('synthetic-project-moon')
    expect(preview.body).not.toContain('12345')
    await f.service.run(preview)
    expect(f.send.mock.calls[0]?.[1]?.body).toBe(preview.body)
  })

  it('also redacts sensitive data typed into focus and claim before storing the preview', async () => {
    const f = await fixture()
    const email = 'sensitive.owner@example.test'
    const phone = '13900139000'
    const review = await f.reviews.open({
      ...f.query,
      focus: `联系 ${email} 核实`,
      expectedRevision: f.review.revision
    })
    const preview = await f.service.prepare({
      ...f.input,
      versionId: review.versions.at(-1)!.id,
      claim: `已通知 ${phone}`
    })
    expect(preview.body).not.toContain(email)
    expect(preview.body).not.toContain(phone)
    expect(preview.claim).not.toContain(phone)
    expect(f.send).not.toHaveBeenCalled()
  })

  it('requires a fresh preview after creating a newer workspace version', async () => {
    const f = await fixture()
    const preview = await f.service.prepare(f.input)
    await writeFile(f.path, 'new version source')
    await f.reviews.open(f.query)
    await expect(f.service.run(preview)).rejects.toThrow('审阅版本已变化')
    expect(f.send).not.toHaveBeenCalled()
  })

  it('runs a credential-containing claim after preview without changing its sanitized input', async () => {
    const f = await fixture()
    f.send.mockImplementation(async () => response(true))
    const preview = await f.service.prepare({
      ...f.input,
      claim: 'API_KEY=sk-abcdefghijklmno123456789'
    })
    expect(preview.body).not.toContain('sk-abcdefghijklmno123456789')
    const receipt = await f.service.run(preview)
    expect(receipt.status).toBe('completed')
    expect(f.send.mock.calls[0]?.[1]?.body).toBe(preview.body)
  })
})
