import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export function createWorkBuddyCliFixture(profile: string) {
  const root = path.join(profile, 'workbuddy-cli')
  const bin = path.join(root, 'bin')
  const program = path.join(bin, 'codebuddy')
  const ledger = path.join(root, 'calls.jsonl')
  mkdirSync(bin, { recursive: true })
  writeFileSync(path.join(root, 'product.json'), JSON.stringify({ productName: 'WorkBuddy' }))
  writeFileSync(ledger, '')
  writeFileSync(
    program,
    `#!${process.execPath}
const fs = require('node:fs')
const readline = require('node:readline')
const ledger = ${JSON.stringify(ledger)}
const send = value => process.stdout.write(JSON.stringify({jsonrpc:'2.0', ...value})+'\\n')
let waiting = null
readline.createInterface({input:process.stdin}).on('line', line => {
  const frame = JSON.parse(line)
  fs.appendFileSync(ledger, JSON.stringify(frame)+'\\n')
  if (frame.method === 'initialize') send({id:frame.id,result:{protocolVersion:1,agentCapabilities:{loadSession:true}}})
  else if (frame.method === 'session/new') send({id:frame.id,result:{sessionId:'workbuddy-fixture-session'}})
  else if (frame.method === 'session/load') send({id:frame.id,result:{}})
  else if (frame.method === 'session/prompt' && frame.params.prompt[0].text.includes('需要确认')) {
    waiting = frame
    send({id:'permission-1',method:'session/request_permission',params:{sessionId:frame.params.sessionId,toolCall:{title:'写入测试文件'},options:[{optionId:'allow',name:'允许本次操作',kind:'allow_once'},{optionId:'deny',name:'取消本次操作',kind:'reject_once'}]}})
  } else if (frame.method === 'session/prompt' && frame.params.prompt[0].text.includes('测试停止')) {
    waiting = frame
  } else if (frame.id === 'permission-1' && frame.result) {
    send({method:'session/update',params:{sessionId:waiting.params.sessionId,update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'已按你的选择取消文件写入。'}}}})
    send({id:waiting.id,result:{stopReason:'end_turn'}})
    waiting = null
  } else if (frame.method === 'session/prompt') {
    send({method:'session/update',params:{sessionId:frame.params.sessionId,update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'已整理好任务步骤：检查材料、标注问题、给出修改建议。'}}}})
    send({id:frame.id,result:{stopReason:'end_turn'}})
  } else if (frame.method === 'session/cancel') { if (waiting) { send({id:waiting.id,result:{stopReason:'cancelled'}}); waiting=null } }
  else if (frame.id) send({id:frame.id,error:{code:-32601,message:'Unknown method'}})
})
`,
    { mode: 0o700 }
  )
  return { program, ledger }
}
