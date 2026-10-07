import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AilyMessagePage } from '../../shared/forflow-aily'
import { AilyConversation } from './aily-conversation'

const binding = {
  profile: 'cli_fixture',
  userId: 'ou_fixture',
  partner: {
    chatId: 'oc_partner',
    name: '测试的智能伙伴',
    botAppId: 'cli_partner',
    botMemberId: 'ou_partner'
  }
}
const history: AilyMessagePage = {
  messages: [{ id: 'om_reply', role: 'assistant', text: '已有回复', time: '1' }],
  olderPageToken: null
}
let directory: string
const conversations: AilyConversation[] = []
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'aily-startup-'))
  vi.stubEnv('HOME', directory)
  vi.stubEnv('USERPROFILE', directory)
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)
})
afterEach(async () => {
  for (const conversation of conversations.splice(0)) {
    await conversation.close()
  }
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  rmSync(directory, { recursive: true, force: true })
})
function createConversation() {
  const conversation = new AilyConversation()
  conversations.push(conversation)
  vi.spyOn(conversation.client, 'status').mockResolvedValue({
    installed: true,
    connection: binding
  })
  vi.spyOn(conversation.client, 'verifyConnection').mockResolvedValue()
  vi.spyOn(conversation.client, 'messages').mockResolvedValue(history)
  return conversation
}

it('opens the saved session before slow history returns and imports it exactly once', async () => {
  const conversation = createConversation()
  let finish = (_page: AilyMessagePage): void => {}
  vi.mocked(conversation.client.messages).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const journal = await conversation.open()
  expect(conversation.client.verifyConnection).toHaveBeenCalledOnce()
  expect(conversation.client.messages).not.toHaveBeenCalled()
  const syncing = conversation.refreshHistory()
  expect(readFileSync(journal.path, 'utf8')).toBe('')
  expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('"state":"working"'))
  finish(history)
  await syncing
  await conversation.refreshHistory()
  expect(readFileSync(journal.path, 'utf8').trim().split('\n')).toHaveLength(1)
  expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('"state":"done"'))
})

it('keeps one writer per Feishu chat and allows reopening after it closes', async () => {
  const original = createConversation()
  await original.open()
  const duplicate = createConversation()
  await expect(duplicate.open()).rejects.toThrow('豆包已在另一个任务中打开')
  expect(duplicate.client.verifyConnection).not.toHaveBeenCalled()
  await duplicate.close()
  await original.refreshHistory()
  await original.close()
  await expect(createConversation().open()).resolves.toBeDefined()
})

it('can retry a failed history sync without reopening or sending a task', async () => {
  const conversation = createConversation()
  const journal = await conversation.open()
  vi.mocked(conversation.client.messages).mockRejectedValueOnce(new Error('连接超时'))
  await expect(conversation.refreshHistory()).rejects.toThrow('连接超时')
  await conversation.refreshHistory()
  expect(readFileSync(journal.path, 'utf8')).toContain('已有回复')
})

it('does not write delayed history or publish readiness after the session closes', async () => {
  const conversation = createConversation()
  let finish = (_page: AilyMessagePage): void => {}
  vi.mocked(conversation.client.messages).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const journal = await conversation.open()
  const syncing = conversation.refreshHistory()
  await conversation.close()
  vi.mocked(process.stdout.write).mockClear()
  finish(history)
  await syncing
  expect(readFileSync(journal.path, 'utf8')).toBe('')
  expect(process.stdout.write).not.toHaveBeenCalled()
})
