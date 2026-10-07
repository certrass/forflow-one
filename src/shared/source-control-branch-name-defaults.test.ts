import { describe, expect, it } from 'vitest'
import { getDefaultSettings } from './constants'
import { planCommitMessageGeneration } from './commit-message-plan'
import { resolveSourceControlAiForOperation } from './source-control-ai'
import type { GlobalSettings } from './global-settings-types'
import type { RepoSourceControlAiOverrides } from './source-control-ai-types'

function settings(): GlobalSettings {
  return { ...getDefaultSettings('/tmp'), defaultTuiAgent: 'codex' }
}

function branchParams(
  value: GlobalSettings,
  hostKey = 'local',
  overrides?: RepoSourceControlAiOverrides
) {
  const result = resolveSourceControlAiForOperation({
    settings: value,
    repo: overrides ? { sourceControlAi: overrides } : null,
    operation: 'branchName',
    discoveryHostKey: hostKey
  })
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.value.params
}

describe('Codex branch naming defaults', () => {
  it.each(['local', 'ssh:build-host'])(
    'lets the CLI on %s select its model and effort',
    (hostKey) => {
      const params = branchParams(settings(), hostKey)
      expect(params).toMatchObject({ agentId: 'codex', model: 'default' })
      expect(params.thinkingLevel).toBeUndefined()
      const result = planCommitMessageGeneration(params, 'Name this task')
      expect(result).toEqual({
        ok: true,
        plan: {
          binary: 'codex',
          args: ['exec', '--ephemeral', '--skip-git-repo-check', '-s', 'read-only'],
          stdinPayload: 'Name this task',
          label: 'Codex'
        }
      })
    }
  )

  it('preserves a selected model that is newer than the bundled catalog', () => {
    const value = settings()
    value.sourceControlAi!.selectedModelByAgent = { codex: 'gpt-6-astra' }
    expect(branchParams(value).model).toBe('gpt-6-astra')
    expect(branchParams(value, 'ssh:other').model).toBe('default')
  })

  it('keeps explicit operation and repository choices ahead of the global choice', () => {
    const value = settings()
    value.sourceControlAi!.selectedModelByAgent = { codex: 'gpt-5.5' }
    value.sourceControlAi!.modelOverridesByOperation = {
      branchName: {
        selectedModelByAgent: { codex: 'gpt-5.4' },
        selectedThinkingByModel: { 'gpt-5.4': 'high' }
      }
    }
    expect(branchParams(value)).toMatchObject({ model: 'gpt-5.4', thinkingLevel: 'high' })
    expect(
      branchParams(value, 'local', {
        modelOverridesByOperation: {
          branchName: {
            selectedModelByAgent: { codex: 'gpt-5.5' },
            selectedThinkingByModel: { 'gpt-5.5': 'medium' }
          }
        }
      })
    ).toMatchObject({ model: 'gpt-5.5', thinkingLevel: 'medium' })
  })

  it('keeps legacy and remote host choices', () => {
    const value = settings()
    value.commitMessageAi!.selectedModelByAgent = { codex: 'gpt-5.4' }
    value.sourceControlAi!.selectedModelByAgentByHost = {
      'ssh:build-host': { codex: 'gpt-5.5' }
    }
    expect(branchParams(value).model).toBe('gpt-5.4')
    expect(branchParams(value, 'ssh:build-host').model).toBe('gpt-5.5')
  })

  it('preserves CLI arguments selected for the naming action', () => {
    const params = branchParams(settings())
    const result = planCommitMessageGeneration(
      { ...params, agentArgs: '--model gpt-6-astra -c model_reasoning_effort=max' },
      'Name this task'
    )
    expect(result.ok && result.plan.args).toEqual([
      'exec',
      '--ephemeral',
      '--skip-git-repo-check',
      '-s',
      'read-only',
      '--model',
      'gpt-6-astra',
      '-c',
      'model_reasoning_effort=max'
    ])
  })

  it.each(['commitMessage', 'pullRequest'] as const)(
    'keeps the %s default unchanged',
    (operation) => {
      const result = resolveSourceControlAiForOperation({ settings: settings(), operation })
      expect(result.ok && result.value.params.model).toBe('gpt-5.5')
    }
  )
})
