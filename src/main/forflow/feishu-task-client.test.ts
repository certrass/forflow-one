import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { runProcess, ProcessResult } from '../../shared/child-process/run-process'
import { FeishuTaskClient } from './feishu-task-client'

const identity = (userId = 'ou_user1') => ({
  appId: 'cli_test',
  brand: 'feishu',
  identities: {
    user: {
      status: 'ready',
      openId: userId,
      userName: '测试用户',
      scope: 'task:task:read task:tasklist:read',
      accessToken: 'must-not-leave-cli'
    }
  }
})
const task = {
  guid: 'task-1',
  summary: '验收任务',
  description: '任务正文',
  completed_at: '0',
  url: 'https://applink.feishu.cn/client/todo/detail?guid=task-1'
}
const result = (value: unknown): ProcessResult => ({
  code: 0,
  signal: null,
  timedOut: false,
  stdout: JSON.stringify(value),
  stderr: ''
})
const envelope = (data: unknown) => ({ ok: true, identity: 'user', data })
let directory: string
let client: FeishuTaskClient
const run = vi.fn<typeof runProcess>()
const resolve = vi.fn(async () => '/fixture/lark-cli')
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'feishu-test-'))
  run.mockReset()
  resolve.mockReset().mockResolvedValue('/fixture/lark-cli')
  run.mockImplementation(async (spec) =>
    result(spec.args?.includes('auth') ? identity() : envelope({ items: [task], has_more: false }))
  )
  client = new FeishuTaskClient(directory, { run, resolve })
})
afterEach(() => rmSync(directory, { recursive: true, force: true }))

describe('Feishu read-only CLI connection', () => {
  it('only binds the app and user, without copying credentials or reading tasks on connect', async () => {
    const status = await client.connect()
    expect(status.connection).toEqual({
      appId: 'cli_test',
      userId: 'ou_user1',
      userName: '测试用户'
    })
    expect(run).toHaveBeenCalledTimes(1)
    expect(run.mock.calls[0][0].args).toEqual(['auth', 'status', '--json'])
    expect(readFileSync(join(directory, 'forflow-feishu-connection.json'), 'utf8')).not.toContain(
      'must-not-leave-cli'
    )
    expect(await new FeishuTaskClient(directory, { run, resolve }).status()).toEqual(status)
  })
  it('pins identity, uses literal JSON args, paginates without an unbounded fetch or mutation', async () => {
    await client.connect()
    const token = "$(touch /tmp/should-not-exist); ' token"
    await client.tasks({ tasklistId: 'list-1', completed: false, pageToken: token })
    const read = run.mock.calls.map(([spec]) => spec).find((spec) => spec.args?.includes('task'))
    expect(read).toMatchObject({
      program: '/fixture/lark-cli',
      timeoutMs: 30000,
      maxOutputBytes: 2097152
    })
    expect(read?.args).toEqual([
      '--profile',
      'cli_test',
      'task',
      'tasklists',
      'tasks',
      '--params',
      JSON.stringify({
        tasklist_guid: 'list-1',
        completed: false,
        page_size: 50,
        page_token: token
      }),
      '--as',
      'user',
      '--format',
      'json'
    ])
    expect(run.mock.calls.filter(([spec]) => spec.args?.includes('auth'))).toHaveLength(3)
  })
  it('reads tasklists and returns a continuation without downloading all pages', async () => {
    await client.connect()
    run.mockImplementation(async (spec) =>
      result(
        spec.args?.includes('auth')
          ? identity()
          : envelope({
              items: [{ guid: 'list-1', name: '研发' }],
              has_more: true,
              page_token: 'next'
            })
      )
    )
    expect(await client.tasklists()).toMatchObject({
      items: [{ id: 'list-1', name: '研发' }],
      nextPageToken: 'next'
    })
    expect(run.mock.calls.filter(([spec]) => spec.args?.includes('task'))).toHaveLength(1)
  })
  it('uses my_tasks scope and fetches detail separately', async () => {
    await client.connect()
    expect(await client.tasks({ completed: true })).toMatchObject({
      items: [{ id: 'task-1', completed: false }]
    })
    expect(run.mock.calls.find(([spec]) => spec.args?.includes('task'))?.[0].args).toContain(
      JSON.stringify({ type: 'my_tasks', completed: true, page_size: 50 })
    )
    run.mockImplementation(async (spec) =>
      result(spec.args?.includes('auth') ? identity() : envelope({ task }))
    )
    expect(await client.task('task-1')).toMatchObject({ id: 'task-1', title: '验收任务' })
  })
  it.each([
    { ...identity(), brand: 'lark' },
    { ...identity(), identities: { user: { status: 'missing' } } },
    {
      ...identity(),
      identities: { user: { status: 'ready', openId: 'ou_user1', scope: 'task:task:read' } }
    }
  ])('rejects unavailable or insufficient personal authorization', async (value) => {
    run.mockResolvedValue(result(value))
    await expect(client.connect()).rejects.toThrow(/授权|权限/)
    expect((await client.status()).connection).toBeNull()
  })
  it('rejects changed user before reading and never falls back to a bot', async () => {
    await client.connect()
    run.mockResolvedValue(result(identity('ou_other')))
    await expect(client.tasks({ completed: false })).rejects.toThrow('已变更')
    expect(run.mock.calls.some(([spec]) => spec.args?.includes('task'))).toBe(false)
  })
  it('discards a response if the connection is removed during the read', async () => {
    await client.connect()
    run.mockImplementation(async (spec) => {
      if (spec.args?.includes('auth')) {
        return result(identity())
      }
      client.disconnect()
      return result(envelope({ items: [task] }))
    })
    await expect(client.tasks({ completed: false })).rejects.toThrow('已变更')
    expect((await client.status()).connection).toBeNull()
  })
  it.each([
    { code: 1, stderr: 'secret-token', stdout: '' },
    { timedOut: true, stderr: 'secret-token' },
    { outputTruncated: true },
    { stdout: 'not JSON secret-token' }
  ])('reports bounded errors without leaking CLI output', async (failure) => {
    await client.connect()
    run.mockResolvedValue({ ...result(null), ...failure })
    await expect(client.tasks({ completed: false })).rejects.toThrow(/飞书/)
    await expect(client.tasks({ completed: false })).rejects.not.toThrow('secret-token')
  })
  it('rejects malformed paging, bot envelopes and invalid task ids', async () => {
    await client.connect()
    for (const data of [
      { ok: true, identity: 'bot', data: { items: [task] } },
      envelope({ items: [], has_more: true })
    ]) {
      run.mockImplementation(async (spec) =>
        result(spec.args?.includes('auth') ? identity() : data)
      )
      await expect(client.tasks({ completed: false })).rejects.toThrow(/飞书/)
    }
    await expect(client.task('../../secret')).rejects.toThrow()
  })
})
