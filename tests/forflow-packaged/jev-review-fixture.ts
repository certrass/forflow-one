import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export function seedJevReview(profile: string): string {
  const dir = path.join(profile, 'home', '.codex', 'sessions')
  mkdirSync(dir, { recursive: true })
  const timestamp = new Date().toISOString()
  const cwd = path.join(profile, 'review-fixture')
  const tokens = {
    input_tokens: 100,
    cached_input_tokens: 20,
    output_tokens: 50,
    total_tokens: 150
  }
  const rows = [
    { type: 'session_meta', payload: { id: 'jev-review-qa', cwd } },
    { timestamp, type: 'turn_context', payload: { cwd, model: 'gpt-5', turn_id: 'qa-turn' } },
    {
      timestamp,
      type: 'token_usage_record',
      payload: { session_id: 'jev-review-qa', response_id: 'qa-response', usage: tokens }
    },
    {
      timestamp,
      type: 'response_item',
      payload: {
        type: 'function_call',
        call_id: 'qa-failed-test',
        name: 'exec',
        arguments: JSON.stringify({
          command: 'run-tests',
          owner: 'qa@example.invalid',
          API_KEY: 'synthetic-credential-never-real'
        })
      }
    },
    {
      timestamp,
      type: 'response_item',
      payload: {
        type: 'function_call_output',
        call_id: 'qa-failed-test',
        output: '测试结束：2 项通过，1 项失败。退出码 1。失败项：重载后找不到已保存的问题。'
      }
    },
    {
      timestamp,
      type: 'response_item',
      payload: {
        type: 'function_call',
        call_id: 'qa-missing-return',
        name: 'exec',
        arguments: 'run-tests-again'
      }
    },
    {
      timestamp,
      type: 'event_msg',
      payload: {
        type: 'token_count',
        info: { last_token_usage: tokens, total_token_usage: tokens }
      }
    }
  ]
  const source = path.join(dir, 'rollout-jev-review-qa.jsonl')
  writeFileSync(source, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`)
  return source
}
