import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import WebSocket from 'ws'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrcaRuntimeService } from '../../../src/main/runtime/orca-runtime'
import { OrcaRuntimeRpcServer } from '../../../src/main/runtime/runtime-rpc'
import { parsePairingCode } from '../transport/pairing'
import { connect, type RpcClient } from '../transport/rpc-client'

vi.mock('expo-crypto', () => ({
  getRandomBytes: (length: number) => new Uint8Array(randomBytes(length))
}))
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
vi.mock('../../../src/main/git/worktree', () => ({
  listWorktrees: vi.fn().mockResolvedValue([]),
  listWorktreesStrict: vi.fn().mockResolvedValue([])
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Forflow mobile connects to the private desktop runtime', () => {
  it('pairs over E2EE without a cloud account and refuses the revoked device', async () => {
    vi.stubGlobal('FORFLOW_BRAND_ENABLED', true)
    vi.stubGlobal('WebSocket', WebSocket)
    vi.stubEnv('FORFLOW_DEPLOYMENT_PROFILE', 'cn-private')
    const userDataPath = mkdtempSync(join(tmpdir(), 'forflow-mobile-'))
    const server = new OrcaRuntimeRpcServer({
      runtime: new OrcaRuntimeService(),
      userDataPath,
      enableWebSocket: true,
      wsPort: 0,
      webClientRoot: userDataPath
    })
    const createPairingRelay = vi.fn().mockRejectedValue(new Error('Cloud account unavailable'))
    server.setMobileRelayPairingProvider({
      createPairingRelay,
      onDeviceRevokeQueued: vi.fn(),
      getEndpoints: vi.fn().mockRejectedValue(new Error('No relay')),
      provisionRelay: vi.fn().mockRejectedValue(new Error('No relay'))
    })
    let client: RpcClient | undefined
    try {
      await server.start()
      const offer = await server.createMobilePairingOffer({
        address: '127.0.0.1',
        connectionMode: 'automatic',
        name: '手机连接测试'
      })
      expect(offer.available).toBe(true)
      if (!offer.available) {
        throw new Error(offer.guidance)
      }
      expect(offer.pairingUrl).toMatch(/^forflow-one-mobile:\/\/pair/)
      const parsed = parsePairingCode(offer.pairingUrl)
      expect(parsed).not.toBeNull()
      if (!parsed) {
        throw new Error('Mobile could not parse the desktop QR')
      }
      expect(parsed.relay).toBeUndefined()
      expect(createPairingRelay).not.toHaveBeenCalled()
      expect(server.getDeviceRegistry()?.getMobilePairingConnectionMode(offer.deviceId)).toBe(
        'local-only'
      )
      client = connect(parsed.endpoint, parsed.deviceToken, parsed.publicKeyB64)
      const reply = await client.sendRequest('status.get', {}, { timeoutMs: 5_000 })
      expect(client.getState()).toBe('connected')
      expect(reply.ok).toBe(true)
      expect(reply._meta?.runtimeId).toBeTruthy()
      client.close()
      expect(await server.revokeMobileDevice(offer.deviceId)).toBe(true)
      client = connect(parsed.endpoint, parsed.deviceToken, parsed.publicKeyB64)
      await expect.poll(() => client?.getState(), { timeout: 10_000 }).toBe('auth-failed')
      expect(createPairingRelay).not.toHaveBeenCalled()
    } finally {
      client?.close()
      await server.stop()
      rmSync(userDataPath, { recursive: true, force: true })
    }
  }, 20_000)
})
