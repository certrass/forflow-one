import { describe, expect, it, vi } from 'vitest'
import { runLocalSourceControlPlan } from './source-control-local-process'
import { generateBranchNameFromContext } from './commit-message-text-generation'
import { createMockDiscoveryChild } from './commit-message-text-generation-test-harness'

describe('branch-name timeout diagnostics', () => {
  it('preserves bounded CLI output when the local timer terminates generation', async () => {
    vi.useFakeTimers()
    const child = createMockDiscoveryChild()
    try {
      const pending = runLocalSourceControlPlan({
        plan: { binary: 'codex', args: ['exec'], stdinPayload: 'Name this task', label: 'Codex' },
        cwd: '/repo',
        env: undefined,
        emptyResultName: 'branch name',
        operation: 'branch-name',
        holdHomeLockUntilExit: false,
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: The fixture provides every stream and event used by this process runner.
        spawnAgent: () => child as never
      })
      child.stdout.emit('data', Buffer.from('private task text'))
      child.stderr.emit('data', Buffer.from('Retrying connection in /Users/private/project\n'))
      await vi.advanceTimersByTimeAsync(60_000)
      const result = await pending.result
      expect(result.success).toBe(false)
      if (result.success) {
        throw new Error('Expected timeout')
      }
      expect(result.error).toContain('Codex generation timed out after 60s.')
      expect(result.error).toContain('Retrying connection')
      expect(result.error).not.toContain('/Users/private')
      expect(result.error).not.toContain('private task text')
      expect(result.failureOutput).toEqual({
        label: 'Codex',
        exitCode: null,
        stdout: 'private task text',
        stderr: 'Retrying connection in /Users/private/project\n'
      })
      expect(child.kill).toHaveBeenCalledWith('SIGKILL')
      expect(child.stdout.listenerCount('data')).toBe(0)
      expect(child.stderr.listenerCount('data')).toBe(0)
      await expect(pending.processClosed).resolves.toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('retains host-reported timeout output through branch-name generation', async () => {
    const result = await generateBranchNameFromContext(
      { firstPrompt: 'Name this task' },
      { agentId: 'codex', model: 'default' },
      {
        kind: 'remote',
        cwd: '/remote/project',
        missingBinaryLocation: 'remote PATH',
        execute: async (plan) => {
          expect(plan.args).not.toContain('--model')
          return {
            exitCode: null,
            timedOut: true,
            stdout: 'private prompt',
            stderr: 'Reconnecting to model service'
          }
        }
      }
    )
    expect(result).toMatchObject({
      success: false,
      error: 'Codex generation timed out after 60s. CLI output: Reconnecting to model service',
      failureOutput: { label: 'Codex', exitCode: null, stderr: 'Reconnecting to model service' }
    })
  })

  it('keeps the timeout reason when the CLI has produced no output', async () => {
    const result = await generateBranchNameFromContext(
      { firstPrompt: 'Name this task' },
      { agentId: 'codex', model: 'default' },
      {
        kind: 'remote',
        cwd: '/repo',
        missingBinaryLocation: 'remote PATH',
        execute: async () => ({ exitCode: null, timedOut: true, stdout: '', stderr: '' })
      }
    )
    expect(result).toMatchObject({ success: false, error: 'Codex generation timed out after 60s.' })
  })
})
