import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KnownRuntimeEnvironment } from '../../shared/runtime-environments'
const mocks = vi.hoisted(() => ({
  approval: vi.fn(),
  environment: vi.fn(),
  manager: vi.fn(),
  generation: vi.fn()
}))
vi.mock('./approval-broker', () => ({
  requestForflowApproval: mocks.approval,
  FORFLOW_UPLOAD_CANCELLED: '已取消数据传输'
}))
vi.mock('../../shared/runtime-environment-store', () => ({ resolveEnvironment: mocks.environment }))
vi.mock('../ipc/ssh', () => ({ getSshConnectionManager: mocks.manager }))
vi.mock('../ssh/ssh-connection-generation', () => ({
  getSshConnectionGeneration: mocks.generation
}))
import {
  confirmForflowRuntimeTransfer,
  confirmForflowSshTransfer,
  describeForflowTransfer
} from './transfer-approval'
let environment: KnownRuntimeEnvironment
const target = { username: 'qa', host: 'host.example', port: 22 }
const connection = { getState: () => ({ status: 'connected' }), getTarget: () => ({ ...target }) }
beforeEach(() => {
  vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'cn-private')
  vi.clearAllMocks()
  environment = {
    id: 'env',
    name: '测试环境',
    createdAt: 1,
    updatedAt: 1,
    lastUsedAt: null,
    pairingRevision: 4,
    runtimeId: 'runtime-1',
    preferredEndpointId: 'endpoint-1',
    endpoints: [
      {
        id: 'endpoint-1',
        kind: 'websocket',
        label: 'local fixture',
        endpoint: 'wss://runtime.example',
        deviceToken: 'fixture-secret',
        publicKeyB64: 'fixture-key'
      }
    ]
  }
  mocks.environment.mockImplementation(() => structuredClone(environment))
  mocks.approval.mockResolvedValue(true)
  mocks.manager.mockReturnValue({ getConnection: () => connection })
  mocks.generation.mockReturnValue(7)
})
afterEach(() => vi.unstubAllEnvs())
describe('data transfer destination confirmation', () => {
  it('binds runtime upload to the confirmed identity and pairing', async () => {
    expect(await confirmForflowRuntimeTransfer('/profile', 'env', 'fixture.txt')).toEqual({
      environmentId: 'env',
      expectedEnvironmentPairingRevision: 4,
      expectedEnvironmentRuntimeId: 'runtime-1'
    })
    expect(JSON.stringify(mocks.approval.mock.calls)).not.toContain('fixture-secret')
  })
  it('does not confuse runtime liveness bookkeeping with a destination change', async () => {
    mocks.approval.mockImplementation(async () => {
      environment.lastUsedAt = 20
      return true
    })
    await expect(
      confirmForflowRuntimeTransfer('/profile', 'env', 'fixture.txt')
    ).resolves.toMatchObject({ environmentId: 'env' })
  })
  it('refuses stale pairing before prompting and re-pairing while prompting', async () => {
    await expect(
      confirmForflowRuntimeTransfer('/profile', 'env', 'fixture.txt', {
        expectedEnvironmentPairingRevision: 3
      })
    ).rejects.toThrow('pairing changed')
    expect(mocks.approval).not.toHaveBeenCalled()
    mocks.approval.mockImplementation(async () => {
      environment.pairingRevision = 5
      return true
    })
    await expect(confirmForflowRuntimeTransfer('/profile', 'env', 'fixture.txt')).rejects.toThrow(
      '目标已变化'
    )
  })
  it('does not allow approval to override upstream-service denial', async () => {
    environment.endpoints[0].endpoint = 'wss://relay.onorca.dev'
    await expect(confirmForflowRuntimeTransfer('/profile', 'env', 'fixture.txt')).rejects.toThrow(
      '已阻止'
    )
    expect(mocks.approval).not.toHaveBeenCalled()
  })
  it('refuses SSH reconnection after the decision', async () => {
    const validate = await confirmForflowSshTransfer('ssh-1', 'fixture.txt', '/workspace')
    validate()
    mocks.generation.mockReturnValue(8)
    expect(validate).toThrow('目标已变化')
  })
  it('honors cancellation for SSH and runtime transfers', async () => {
    mocks.approval.mockResolvedValue(false)
    await expect(confirmForflowSshTransfer('ssh-1', 'fixture.txt', '/workspace')).rejects.toThrow(
      '已取消'
    )
    await expect(confirmForflowRuntimeTransfer('/profile', 'env', 'fixture.txt')).rejects.toThrow(
      '已取消'
    )
  })
  it('escapes names in the confirmation and bounds malformed or excessive input', () => {
    expect(describeForflowTransfer(['/fake/line\n目标'], 3)).toContain('line\\n目标')
    expect(() => describeForflowTransfer(['/bad\0name'])).toThrow()
    expect(() => describeForflowTransfer(Array(257).fill('/file'))).toThrow()
  })
})
