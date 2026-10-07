import { describe, expect, it } from 'vitest'
import { nativeChatLineDecoderForAgent } from './transcript-tail-reader'
import { nativeChatTurnLifecycleDecoderForAgent } from './transcript-turn-lifecycle'
import { parseAgentStatusPayload } from '../../shared/agent-status-types'
import { getAgentResumeArgv } from '../../shared/agent-session-resume'

describe('CLI companion native chat contract', () => {
  it.each(['aily', 'workbuddy'] as const)(
    'renders %s through the native transcript model',
    (agent) => {
      expect(
        nativeChatLineDecoderForAgent(agent)?.(
          JSON.stringify({
            type: 'forflow-companion-message',
            id: 'reply-1',
            role: 'assistant',
            text: '已整理出三个步骤。',
            timestamp: 123
          }),
          'fallback'
        )
      ).toMatchObject({
        id: 'reply-1',
        role: 'assistant',
        blocks: [{ type: 'text', text: '已整理出三个步骤。' }]
      })
      expect(
        nativeChatTurnLifecycleDecoderForAgent(agent)?.(
          JSON.stringify({
            type: 'forflow-companion-turn',
            state: 'interrupted',
            turnId: 'turn-1',
            timestamp: 123
          }),
          'fallback'
        )
      ).toEqual({ state: 'interrupted', turnId: 'turn-1', timestamp: 123 })
      expect(getAgentResumeArgv(agent, { key: 'session_id', id: 'session-1' })).toEqual([
        'forflow',
        agent,
        '--resume',
        'session-1'
      ])
    }
  )

  it('admits the companion identity without changing other OSC providers', () => {
    const providerSession = {
      key: 'session_id',
      id: 'session-1',
      transcriptPath: '/tmp/companion.jsonl'
    }
    expect(
      parseAgentStatusPayload(JSON.stringify({ state: 'done', agentType: 'aily', providerSession }))
    ).toMatchObject({ providerSession })
    expect(
      parseAgentStatusPayload(
        JSON.stringify({ state: 'done', agentType: 'claude', providerSession })
      )
    ).not.toHaveProperty('providerSession')
    expect(
      parseAgentStatusPayload(
        JSON.stringify({ state: 'done', agentType: 'aily', providerSession: { id: '../bad' } })
      )
    ).not.toHaveProperty('providerSession')
  })
})
