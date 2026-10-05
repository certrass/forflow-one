import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/** Speaks the real app-server transport from an isolated executable; no model API. */
export function createStructuredCodexFixture(profile: string) {
  const bin = path.join(profile, 'fixture-bin')
  const ledger = path.join(profile, 'structured-calls.jsonl')
  mkdirSync(bin, { recursive: true })
  writeFileSync(ledger, '')
  writeFileSync(
    path.join(bin, 'codex'),
    `#!${process.execPath}
const fs = require('node:fs')
const readline = require('node:readline')
const ledger = ${JSON.stringify(ledger)}
const threadId = 'forflow-structured-fixture'
const turnId = 'turn-fixture'
const childId = 'forflow-review-fixture'
const send = value => process.stdout.write(JSON.stringify(value) + '\\n')
const notify = (method, params) => send({jsonrpc:'2.0', method, params})
if (process.argv.includes('--version')) {
  console.log('codex-cli 0.120.0')
  process.exit(0)
}
if (!process.argv.includes('app-server')) process.exit(1)
readline.createInterface({input:process.stdin}).on('line', line => {
  const {id, method, params = {}} = JSON.parse(line)
  fs.appendFileSync(ledger, JSON.stringify({method, params}) + '\\n')
  if (id === undefined) return
  let result = {}
  if (method === 'thread/start' || method === 'thread/resume') {
    result = {thread:{id:threadId}, model:'fixture-model', reasoningEffort:'medium'}
  } else if (method === 'model/list') {
    result = {data:[{model:'fixture-model',displayName:'Fixture Model',hidden:false,
      supportedReasoningEfforts:[{reasoningEffort:'medium',description:'Balanced'}],
      defaultReasoningEffort:'medium',isDefault:true}], nextCursor:null}
  } else if (method === 'turn/start') {
    result = {turn:{id:turnId}}
    setTimeout(() => {
      notify('turn/started', {threadId, turn:{id:turnId}})
      notify('item/completed', {threadId,turnId,item:{type:'userMessage',id:'user-1',
        clientId:params.clientUserMessageId,content:params.input}})
      notify('item/completed', {threadId,turnId,item:{type:'agentMessage',id:'answer-1',
        text:'已读取审阅材料，正在检查来源。'}})
      notify('item/started', {threadId,turnId,item:{type:'subAgentActivity',id:'spawn-review',
        kind:'started',agentThreadId:childId,agentPath:'/root/review'}})
      notify('turn/started', {threadId:childId,turn:{id:'child-turn'}})
    }, 30)
  } else if (method === 'turn/interrupt') {
    setTimeout(() => {
      notify('turn/completed', {threadId:childId,turn:{id:'child-turn',status:'interrupted'}})
      notify('turn/completed', {threadId,turn:{id:turnId,status:'interrupted'}})
    }, 30)
  }
  send({jsonrpc:'2.0',id,result})
})
`,
    { mode: 0o755 }
  )
  return { bin, ledger }
}
