import { writeFileSync } from 'node:fs'
import path from 'node:path'

/** A local PTY + real hook transport fixture; it never contacts a model provider. */
export function createChatProviderFixture(profile: string): {
  command: string
  ledger: string
  transcript: string
} {
  const script = path.join(profile, 'claude.cjs')
  const ledger = path.join(profile, 'chat-input.jsonl')
  const transcript = path.join(profile, 'chat-transcript.jsonl')
  writeFileSync(ledger, '')
  writeFileSync(
    script,
    `
const fs = require('node:fs')
const readline = require('node:readline')
const transcript = ${JSON.stringify(transcript)}
const ledger = ${JSON.stringify(ledger)}
const sessionId = 'forflow-gui-fixture-session'
function message(role, text) {
  fs.appendFileSync(transcript, JSON.stringify({sessionId, uuid: crypto.randomUUID(),
    timestamp: new Date().toISOString(), type: role,
    message: {role, content:[{type:'text', text}]}}) + '\\n')
}
async function hook() {
  const response = await fetch('http://127.0.0.1:' + process.env.ORCA_AGENT_HOOK_PORT + '/hook/claude', {
    method:'POST', headers:{'Content-Type':'application/json',
      'X-Orca-Agent-Hook-Token': process.env.ORCA_AGENT_HOOK_TOKEN},
    body: JSON.stringify({paneKey:process.env.ORCA_PANE_KEY, tabId:process.env.ORCA_TAB_ID,
      worktreeId:process.env.ORCA_WORKTREE_ID, launchToken:process.env.ORCA_AGENT_LAUNCH_TOKEN,
      env:process.env.ORCA_AGENT_HOOK_ENV, version:process.env.ORCA_AGENT_HOOK_VERSION,
      payload:{hook_event_name:'Stop',session_id:sessionId, transcript_path:transcript}})
  })
  if (!response.ok) throw new Error('fixture hook rejected: ' + response.status)
}
message('user', '工作台测试任务')
message('assistant', '已连接原会话，可在对话与终端间切换。')
fs.appendFileSync(ledger, JSON.stringify({type:'start',pid:process.pid})+'\\n')
process.stdout.write('\\x1b]0;Claude\\x07GUI_FIXTURE_READY\\n')
hook().catch(e => { console.error(e.message); process.exit(1) })
const timer = setInterval(() => hook().catch(e => console.error(e.message)), 2000)
readline.createInterface({input:process.stdin}).on('line', input => {
  const text = input.replace(/\\x1b\\[[0-9;]*[A-Za-z~]/g, '').replace(/\\x15/g,'')
  fs.appendFileSync(ledger, JSON.stringify({type:'input',text,pid:process.pid})+'\\n')
  message('user', text)
  message('assistant', '收到：' + text)
  hook().catch(e => console.error(e.message))
})
process.on('SIGINT', () => { clearInterval(timer); process.exit(0) })
`
  )
  const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`
  return { command: `${quote(process.execPath)} ${quote(script)}\r`, ledger, transcript }
}
