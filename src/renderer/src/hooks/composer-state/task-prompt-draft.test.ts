import { describe, expect, it } from 'vitest'
import { resolveQuickCreateLinkedWorkItemPrompt } from '@/lib/linked-work-item-context'
import {
  resolveFolderWorkspaceLaunchDraft,
  buildFolderWorkspaceLinkedStartupPlan
} from '@/components/sidebar/folder-workspace-agent-startup'
import { buildQuickComposerStartup } from './quick-startup-plan'

describe('reviewable task prompt in existing workspace launch paths', () => {
  const goal = '完成飞书任务\n保留来源和测试结果'
  it('keeps the edited goal plus existing linked context as an unsent draft', () => {
    const linked = {
      provider: 'github' as const,
      number: 1,
      url: 'https://github.com/example/test/issues/1'
    }
    const result = resolveQuickCreateLinkedWorkItemPrompt(linked, '保留备注', goal)
    expect(result.prompt).toBe('')
    expect(result.draftPrompt).toBe(`${goal}\n\n保留备注\n\n${linked.url}`)
    expect(resolveFolderWorkspaceLaunchDraft(null, '保留备注', goal)).toBe(`${goal}\n\n保留备注`)
  })
  it.each(['darwin', 'linux', 'win32'] as const)(
    'retains the same Codex draft for git and folder workspaces on %s',
    (platform) => {
      const git = buildQuickComposerStartup({
        agent: 'codex',
        prompt: '',
        draftPrompt: goal,
        settings: null,
        repoConnectionId: platform === 'linux' ? 'ssh-1' : null,
        platform,
        shell: platform === 'win32' ? 'cmd' : 'posix',
        isRemote: platform === 'linux',
        telemetrySource: 'unknown'
      })
      const folder = buildFolderWorkspaceLinkedStartupPlan({
        agent: 'codex',
        linkedWorkItem: null,
        taskPrompt: goal,
        note: '',
        agentCmdOverrides: {},
        platform,
        shell: platform === 'win32' ? 'cmd' : 'posix',
        isRemote: platform === 'linux'
      })
      for (const plan of [git.startupPlan, folder]) {
        expect(plan?.followupPrompt).toBeNull()
        expect(plan?.draftPrompt).toBe(goal)
      }
    }
  )
})
