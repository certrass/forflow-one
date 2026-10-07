import { writeFileSync } from 'node:fs'
import path from 'node:path'

/** A local PTY + real hook transport fixture; it never contacts a model provider. */
export function createChatProviderFixture(
  profile: string,
  agent: 'claude' | 'codex' = 'claude',
  options: { seedConversation?: boolean; independentSessions?: boolean } = {}
): {
  command: string
  ledger: string
  transcript: string
} {
  const script = path.join(profile, `${agent}.cjs`)
  const ledger = path.join(profile, 'chat-input.jsonl')
  const transcript = path.join(profile, 'chat-transcript.jsonl')
  writeFileSync(ledger, '')
  writeFileSync(
    script,
    `
const fs = require('node:fs')
const readline = require('node:readline')
const initialTranscript = ${JSON.stringify(transcript)}
const independentSessions = ${JSON.stringify(options.independentSessions === true)}
const tabId = process.env.ORCA_TAB_ID || String(process.pid)
const transcript = independentSessions
  ? initialTranscript + '.' + tabId.replace(/[^a-zA-Z0-9_-]/g, '_') + '.jsonl'
  : initialTranscript
const emptyTranscript = !fs.existsSync(transcript) || fs.statSync(transcript).size === 0
fs.appendFileSync(transcript, '')
const ledger = ${JSON.stringify(ledger)}
const agent = ${JSON.stringify(agent)}
const sessionId = 'forflow-gui-fixture-session' + (independentSessions ? '-' + tabId : '')
let working = false
let recordTime = Date.now()
function record(type, payload) {
  fs.appendFileSync(transcript, JSON.stringify({timestamp:new Date(recordTime++).toISOString(),type,payload})+'\\n')
}
function message(role, text) {
  if (agent === 'codex') {
    record('response_item', {type:'message',id:crypto.randomUUID(),role,
      content:[{type:role === 'user' ? 'input_text' : 'output_text',text}]})
    record('event_msg', {type:'item_completed',item:{type:role === 'user' ? 'UserMessage' : 'AgentMessage',
      id:crypto.randomUUID(),content:[{type:'text',text}]}})
    return
  }
  fs.appendFileSync(transcript, JSON.stringify({sessionId, uuid: crypto.randomUUID(),
    timestamp: new Date().toISOString(), type: role,
    message: {role, content:[{type:'text', text}]}}) + '\\n')
}
async function hook(event = working ? 'UserPromptSubmit' : 'Stop') {
  const response = await fetch('http://127.0.0.1:' + process.env.ORCA_AGENT_HOOK_PORT + '/hook/' + agent, {
    method:'POST', headers:{'Content-Type':'application/json',
      'X-Orca-Agent-Hook-Token': process.env.ORCA_AGENT_HOOK_TOKEN},
    body: JSON.stringify({paneKey:process.env.ORCA_PANE_KEY, tabId:process.env.ORCA_TAB_ID,
      worktreeId:process.env.ORCA_WORKTREE_ID, launchToken:process.env.ORCA_AGENT_LAUNCH_TOKEN,
      env:process.env.ORCA_AGENT_HOOK_ENV, version:process.env.ORCA_AGENT_HOOK_VERSION,
      payload:{hook_event_name:event,session_id:sessionId, transcript_path:transcript}})
  })
  if (!response.ok) throw new Error('fixture hook rejected: ' + response.status)
}
if (agent === 'codex') record('session_meta', {id:sessionId,cwd:process.cwd(),history_mode:'paginated'})
if (${JSON.stringify(options.seedConversation !== false)} && (!independentSessions || emptyTranscript)) {
  message('user', '工作台测试任务')
  message('assistant', '已连接原会话，可在对话与终端间切换。')
}
fs.appendFileSync(ledger, JSON.stringify({type:'start',pid:process.pid,tabId,transcript})+'\\n')
process.stdout.write('\\x1b]0;' + agent + '\\x07GUI_FIXTURE_READY\\n')
hook().catch(e => { console.error(e.message); process.exit(1) })
const timer = setInterval(() => hook().catch(e => console.error(e.message)), 2000)
function receive(input) {
  const text = input.replace(/\\x1b\\[[0-9;]*[A-Za-z~]/g, '').replace(/\\x15/g,'')
  fs.appendFileSync(ledger, JSON.stringify({type:'input',text,pid:process.pid})+'\\n')
  message('user', text)
  if (agent === 'codex') {
    working = true
    record('event_msg', {type:'task_started',turn_id:'turn-fixture'})
    hook().catch(e => console.error(e.message))
    return
  }
  message('assistant', '收到：' + text)
  hook().catch(e => console.error(e.message))
}
if (agent === 'codex') {
  process.stdin.setEncoding('utf8')
  process.stdin.setRawMode(true)
  let pending = ''
  let draft = ''
  let pasted = false
  process.stdin.on('data', chunk => {
    pending += chunk
    while (pending) {
      if (pending.startsWith('\\x1b[')) {
        const match = pending.match(/^\\x1b\\[[0-9;?]*[A-Za-z~]/)
        if (!match) return
        if (match[0] === '\\x1b[200~') pasted = true
        if (match[0] === '\\x1b[201~') pasted = false
        pending = pending.slice(match[0].length)
        continue
      }
      const char = pending[0]
      pending = pending.slice(1)
      if (char === '\\x03') process.exit(0)
      if (char === '\\x1b' && !pasted) {
        working = false
        record('event_msg', {type:'turn_aborted',reason:'interrupted',turn_id:'turn-fixture'})
        message('assistant', '本轮已停止，可以继续输入。')
        fs.appendFileSync(ledger, JSON.stringify({type:'stop',pid:process.pid})+'\\n')
        hook().catch(e => console.error(e.message))
      } else if (char === '\\x15' && !pasted) {
        draft = ''
      } else if (char === '\\r' && !pasted) {
        if (draft) receive(draft)
        draft = ''
      } else {
        draft += char
      }
    }
  })
} else {
  readline.createInterface({input:process.stdin}).on('line', receive)
}
process.on('SIGINT', () => { clearInterval(timer); process.exit(0) })
`
  )
  const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`
  return { command: `${quote(process.execPath)} ${quote(script)}\r`, ledger, transcript }
}
