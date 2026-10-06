import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { runProcess, ProcessResult } from '../../shared/child-process/run-process'
import { AilyClient } from './aily-client'

const envelope = (data: unknown) => ({ ok: true, identity: 'user', data })
const result = (value: unknown): ProcessResult => ({
  code: 0,
  signal: null,
  timedOut: false,
  stdout: JSON.stringify(value),
  stderr: ''
})
const partner = {
  chatId: 'oc_personal',
  name: '测试的智能伙伴',
  botAppId: 'cli_partner',
  botMemberId: 'ou_bot'
}
const run = vi.fn<typeof runProcess>()
const resolve = vi.fn(async () => '/fixture/lark-cli')
let userId: string
let directory: string
let client: AilyClient
let messages: unknown[]
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'aily-test-'))
  userId = 'ou_owner'
  messages = []
  run.mockReset().mockImplementation(async (spec) => {
    const args = spec.args ?? []
    if (args.includes('auth')) {
      return result({
        appId: 'cli_profile',
        brand: 'feishu',
        identities: {
          user: {
            status: 'ready',
            openId: userId,
            scope: 'im:message.send_as_user',
            accessToken: 'never-copy-token'
          }
        }
      })
    }
    if (args.includes('+chat-list')) {
      return result(
        envelope({
          chats: [
            { chat_id: 'oc_notices', name: '豆包工作伙伴', chat_mode: 'p2p' },
            { chat_id: partner.chatId, name: partner.name, chat_mode: 'p2p' },
            { chat_id: 'oc_group', name: '团队的智能伙伴', chat_mode: 'group' }
          ],
          has_more: false
        })
      )
    }
    if (args.includes('+chat-members-list')) {
      return result(
        envelope({
          bots: [{ name: partner.name, app_id: partner.botAppId, member_id: partner.botMemberId }]
        })
      )
    }
    if (args.includes('+chat-messages-list')) {
      return result(envelope({ messages, has_more: false }))
    }
    if (args.includes('+messages-send')) {
      return result(envelope({ message_id: 'om_sent' }))
    }
    throw new Error('Unexpected command')
  })
  client = new AilyClient(directory, { run, resolve })
})
afterEach(() => rmSync(directory, { recursive: true, force: true }))

describe('personal Feishu work partner', () => {
  it('discovers the personal bot, excluding the notification channel and groups', async () => {
    expect(await client.discover()).toEqual({ partners: [partner], hasMore: false })
    expect(
      run.mock.calls.filter(([spec]) => spec.args?.includes('+chat-members-list'))
    ).toHaveLength(1)
    await expect(client.connect('oc_notices')).rejects.toThrow('未找到')
  })
  it('binds the selected account and bot without copying credentials', async () => {
    await client.connect(partner.chatId)
    expect(readFileSync(join(directory, 'forflow-aily-connection.json'), 'utf8')).not.toContain(
      'never-copy-token'
    )
    expect(
      (await new AilyClient(directory, { run, resolve }).status()).connection?.partner
    ).toEqual(partner)
  })
  it('reads only the owner and selected bot, returning chronological order', async () => {
    await client.connect(partner.chatId)
    messages = [
      { message_id: 'om_2', content: '回复', sender: { id: partner.botAppId, sender_type: 'app' } },
      {
        message_id: 'om_other',
        content: '不相关',
        sender: { id: 'cli_other', sender_type: 'app' }
      },
      { message_id: 'om_deleted', deleted: true, sender: { id: userId, sender_type: 'user' } },
      { message_id: 'om_1', content: '任务', sender: { id: userId, sender_type: 'user' } }
    ]
    expect((await client.messages()).messages.map((message) => [message.id, message.role])).toEqual(
      [
        ['om_1', 'user'],
        ['om_2', 'assistant']
      ]
    )
  })
  it('does not send after the CLI account changes', async () => {
    await client.connect(partner.chatId)
    userId = 'ou_other'
    await expect(
      client.send({ text: '任务', requestId: 'ced7b8b1-c99b-4f69-bffa-c00c086c1d66' })
    ).rejects.toThrow('账号或工作伙伴已变更')
    expect(run.mock.calls.some(([spec]) => spec.args?.includes('+messages-send'))).toBe(false)
  })
  it('sends literal arguments with a stable retry key and explicit user identity', async () => {
    await client.connect(partner.chatId)
    const input = {
      text: '解释 $(whoami) 和 `pwd`\n第二行',
      requestId: 'ced7b8b1-c99b-4f69-bffa-c00c086c1d66'
    }
    expect(await client.send(input)).toEqual({ messageId: 'om_sent' })
    expect(await client.send(input)).toEqual({ messageId: 'om_sent' })
    const sent = run.mock.calls.filter(([spec]) => spec.args?.includes('+messages-send'))
    expect(sent[0][0].args).toEqual(sent[1][0].args)
    expect(sent[0][0].args).toEqual([
      '--profile',
      'cli_profile',
      'im',
      '+messages-send',
      '--text',
      input.text,
      '--idempotency-key',
      input.requestId,
      '--chat-id',
      partner.chatId,
      '--as',
      'user',
      '--format',
      'json'
    ])
  })
  it('rejects invalid content and requires a connection after disconnect', async () => {
    await client.connect(partner.chatId)
    await expect(client.send({ text: '', requestId: 'bad' })).rejects.toThrow()
    client.disconnect()
    await expect(client.messages()).rejects.toThrow('先连接')
    expect((await client.status()).connection).toBeNull()
  })
})
