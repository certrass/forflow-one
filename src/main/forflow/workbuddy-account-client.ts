import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { WorkBuddyConnection } from '../../shared/workbuddy-acp-connection'
import { resolveWorkBuddyCli } from '../../shared/workbuddy-cli-location'
import type { WorkBuddyAccountStatus } from '../../shared/forflow-workbuddy-account'

const displayText = z.string().trim().max(256).nullish()
const accountResponse = z.object({
  userInfo: z
    .object({
      userId: z.string().trim().min(1).max(256),
      userNickname: displayText,
      userName: displayText,
      authType: displayText,
      enterpriseName: displayText
    })
    .nullable()
})

export class WorkBuddyAccountClient {
  private pending: Promise<WorkBuddyAccountStatus> | undefined

  getStatus(): Promise<WorkBuddyAccountStatus> {
    this.pending ??= this.readAccount()
      .catch((): WorkBuddyAccountStatus => ({
        state: 'unavailable'
      }))
      .finally(() => {
        this.pending = undefined
      })
    return this.pending
  }

  private async readAccount(): Promise<WorkBuddyAccountStatus> {
    const program = resolveWorkBuddyCli()
    if (!program) {
      return { state: 'not-installed' }
    }
    const directory = await mkdtemp(join(tmpdir(), 'forflow-workbuddy-account-'))
    let connection: WorkBuddyConnection | undefined
    try {
      connection = new WorkBuddyConnection(
        program,
        directory,
        (_method, _params, id) => {
          if (id !== undefined) {
            connection?.refuse(id)
          }
        },
        {
          args: ['--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--tools', ''],
          env: {
            CODEBUDDY_CONFIG_DIR: join(directory, 'config'),
            WORKBUDDY_CONFIG_DIR: join(directory, 'config'),
            DISABLE_TELEMETRY: '1',
            CODEBUDDY_DISABLE_CRON: '1'
          }
        }
      )
      const initialized = await connection.request(
        'initialize',
        {
          protocolVersion: 1,
          clientCapabilities: {},
          clientInfo: { name: 'forflow-one', version: '1' }
        },
        15_000
      )
      z.object({ protocolVersion: z.literal(1) }).parse(initialized)
      const result = accountResponse.parse(
        await connection.request('_codebuddy.ai/getUserInfo', {}, 10_000)
      )
      const account = result.userInfo
      if (!account) {
        return { state: 'signed-out' }
      }
      // Only display fields cross IPC; the vendor response also carries access tokens.
      return {
        state: 'signed-in',
        userId: account.userId,
        name: account.userNickname || account.userName || null,
        accountType:
          account.authType === 'personal' || account.authType === 'enterprise'
            ? account.authType
            : null,
        organization: account.enterpriseName || null
      }
    } finally {
      try {
        await connection?.close()
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  }
}
