import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAgentStartupPlan } from './tui-agent-startup'
import { tokenizeStartupCommand } from './tui-agent-startup-shell'
import { recognizeAgentProcessFromCommandLine } from './agent-process-recognition'
import { getTuiAgentAutoPickOrder, pickTuiAgent } from './tui-agent-selection'
import { getTuiAgentDetectCommands, TUI_AGENT_CONFIG } from './tui-agent-config'
import { ALL_TUI_AGENTS } from './tui-agent-display-names'

afterEach(() => vi.unstubAllGlobals())

describe('domestic CLI launch contract', () => {
  it.each(['linux', 'darwin', 'win32'] as const)('keeps task text literal on %s', (platform) => {
    const prompt = "--print 审查 Bob's $(touch /tmp/not-a-command)"
    const buddy = buildAgentStartupPlan({ agent: 'codebuddy', prompt, cmdOverrides: {}, platform })
    const qoder = buildAgentStartupPlan({ agent: 'qoder-cn', prompt, cmdOverrides: {}, platform })
    const shell = platform === 'win32' ? 'powershell' : 'posix'
    expect(tokenizeStartupCommand(buddy?.launchCommand ?? '', shell)).toMatchObject({
      ok: true,
      tokens: ['codebuddy', '--', prompt]
    })
    expect(tokenizeStartupCommand(qoder?.launchCommand ?? '', shell)).toMatchObject({
      ok: true,
      tokens: ['qodercn', '--prompt-interactive', prompt]
    })
    expect(buddy?.followupPrompt).toBeNull()
    expect(qoder?.followupPrompt).toBeNull()
  })

  it('detects documented CodeBuddy aliases without treating WorkBuddy as a CLI', () => {
    expect(getTuiAgentDetectCommands(TUI_AGENT_CONFIG.codebuddy)).toEqual([
      'codebuddy',
      'cbc',
      'codebuddy-code'
    ])
    expect(recognizeAgentProcessFromCommandLine('cbc')).toMatchObject({ agent: 'codebuddy' })
    expect(recognizeAgentProcessFromCommandLine('workbuddy')).toBeNull()
    expect(recognizeAgentProcessFromCommandLine('arkcli chat')).toBeNull()
    expect(recognizeAgentProcessFromCommandLine('qoder')).toBeNull()
  })

  it.each([
    'codebuddy -- "--print"',
    'qodercn',
    'qodercn --prompt-interactive "--print"',
    'qodercn -i "检查项目" --model auto',
    'qodercn --config-dir "/tmp/Forflow One/qoder" --permission-mode default',
    'qodercn -r session-1'
  ])('recognizes interactive invocation %s', (command) => {
    expect(recognizeAgentProcessFromCommandLine(command)).not.toBeNull()
  })

  it.each([
    'codebuddy -p "检查项目"',
    'codebuddy --acp',
    'codebuddy --serve',
    'qodercn -p "检查项目"',
    'qodercn "检查项目"',
    'qodercn --model auto "检查项目"',
    'qodercn -- "--prompt-interactive"',
    'qodercn --acp',
    'qodercn -o stream-json',
    'qodercn --print -i "检查项目"'
  ])('does not reuse a non-interactive process %s', (command) => {
    expect(recognizeAgentProcessFromCommandLine(command)).toBeNull()
    expect(
      recognizeAgentProcessFromCommandLine(command, { includeHeadlessOneShot: true })
    ).not.toBeNull()
  })

  it('prefers domestic executors only for the Forflow build and preserves an explicit choice', () => {
    expect(pickTuiAgent(null, ['codex', 'codebuddy'])).toBe('codex')
    vi.stubGlobal('FORFLOW_BRAND_ENABLED', true)
    expect(pickTuiAgent(null, ['codex', 'codebuddy'])).toBe('codebuddy')
    expect(pickTuiAgent(null, ['codex', 'continue', 'openclaw'])).toBeNull()
    expect(pickTuiAgent(null, ['qoder-cn', 'codebuddy'], ['codebuddy'])).toBe('qoder-cn')
    expect(pickTuiAgent('codex', ['codex', 'codebuddy'])).toBe('codex')
    expect(new Set(getTuiAgentAutoPickOrder())).toEqual(new Set(ALL_TUI_AGENTS))
  })
})
