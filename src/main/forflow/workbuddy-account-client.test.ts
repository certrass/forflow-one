import { access } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  request: vi.fn(),
  close: vi.fn(),
  start: vi.fn(),
  refuse: vi.fn()
}))
vi.mock('../../shared/workbuddy-cli-location', () => ({ resolveWorkBuddyCli: mocks.resolve }))
vi.mock('../../shared/workbuddy-acp-connection', () => ({
  WorkBuddyConnection: class {
    constructor(...args: unknown[]) {
      mocks.start(...args)
    }
    request = mocks.request
    close = mocks.close
    refuse = mocks.refuse
  }
}))
import { WorkBuddyAccountClient } from './workbuddy-account-client'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.resolve.mockReturnValue('/installed/workbuddy')
  mocks.request.mockResolvedValueOnce({ protocolVersion: 1 })
  mocks.close.mockResolvedValue(undefined)
})

describe('WorkBuddy account read', () => {
  it('returns only display fields, shares in-flight reads and never creates a task', async () => {
    mocks.request.mockResolvedValueOnce({
      userInfo: {
        userId: 'account-1',
        userName: 'fallback',
        userNickname: '小流',
        authType: 'personal',
        token: 'secret-token',
        accessToken: 'secret-access',
        nested: { credential: 'secret-nested' }
      }
    })
    const client = new WorkBuddyAccountClient()
    const first = client.getStatus()
    expect(client.getStatus()).toBe(first)
    expect(await first).toEqual({
      state: 'signed-in',
      userId: 'account-1',
      name: '小流',
      accountType: 'personal',
      organization: null
    })
    expect(mocks.request.mock.calls.map(([method]) => method)).toEqual([
      'initialize',
      '_codebuddy.ai/getUserInfo'
    ])
    expect(mocks.start).toHaveBeenCalledOnce()
    const [, directory, receive, options] = mocks.start.mock.calls[0]
    expect(options.args).toEqual([
      '--strict-mcp-config',
      '--mcp-config',
      '{"mcpServers":{}}',
      '--tools',
      ''
    ])
    expect(options.env.CODEBUDDY_CONFIG_DIR).toContain(directory)
    receive('session/request_permission', {}, 9)
    expect(mocks.refuse).toHaveBeenCalledWith(9)
    expect(mocks.close).toHaveBeenCalledOnce()
    await expect(access(directory)).rejects.toThrow()
  })

  it('reads again on refresh and supports enterprise identity', async () => {
    mocks.request.mockResolvedValueOnce({ userInfo: null })
    const client = new WorkBuddyAccountClient()
    expect(await client.getStatus()).toEqual({ state: 'signed-out' })
    mocks.request.mockResolvedValueOnce({ protocolVersion: 1 }).mockResolvedValueOnce({
      userInfo: {
        userId: 'account-2',
        userName: '同事',
        authType: 'enterprise',
        enterpriseName: '示例团队'
      }
    })
    expect(await client.getStatus()).toEqual({
      state: 'signed-in',
      userId: 'account-2',
      name: '同事',
      accountType: 'enterprise',
      organization: '示例团队'
    })
    expect(mocks.start).toHaveBeenCalledTimes(2)
  })

  it.each([{}, { userInfo: {} }, { userInfo: { userId: 123 } }])(
    'does not mistake malformed data for signed out: %j',
    async (response) => {
      mocks.request.mockResolvedValueOnce(response)
      expect(await new WorkBuddyAccountClient().getStatus()).toEqual({ state: 'unavailable' })
      expect(mocks.close).toHaveBeenCalledOnce()
    }
  )

  it('maps timeout or vendor errors to a safe state and cleans up before retry', async () => {
    mocks.request.mockReset().mockRejectedValue(new Error('secret-token /private/path'))
    const client = new WorkBuddyAccountClient()
    expect(await client.getStatus()).toEqual({ state: 'unavailable' })
    expect(mocks.request).toHaveBeenCalledWith('initialize', expect.anything(), 15_000)
    expect(mocks.close).toHaveBeenCalledOnce()
    await expect(access(mocks.start.mock.calls[0][1])).rejects.toThrow()
    mocks.resolve.mockReturnValue(null)
    expect(await client.getStatus()).toEqual({ state: 'not-installed' })
    expect(mocks.start).toHaveBeenCalledOnce()
  })
})
