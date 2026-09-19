import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export function createFeishuCliFixture(profile: string): { bin: string; ledger: string } {
  const bin = path.join(profile, 'fixture-bin')
  const ledger = path.join(profile, 'feishu-calls.jsonl')
  mkdirSync(bin)
  writeFileSync(ledger, '')
  writeFileSync(
    path.join(bin, 'lark-cli'),
    `#!${process.execPath}
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(${JSON.stringify(ledger)}, JSON.stringify(args) + '\\n')
const task = {guid:'task-1',summary:'修复任务登录流程',description:'保留现有登录方式。完成后给出测试结果。',completed_at:'0',url:'https://applink.feishu.cn/client/todo/detail?guid=task-1',updated_at:'1789848000000'}
if (args.includes('auth') && args.includes('status')) {
  console.log(JSON.stringify({appId:'cli_fixture',brand:'feishu',identities:{user:{status:'ready',openId:'ou_fixture',userName:'隔离测试用户',scope:'task:task:read task:tasklist:read'}}}))
} else {
  const index = args.indexOf('task')
  const resource = args[index + 1], operation = args[index + 2]
  const params = JSON.parse(args[args.indexOf('--params') + 1])
  if (args[args.indexOf('--as') + 1] !== 'user' || !['list','tasks','get'].includes(operation)) process.exit(2)
  const data = operation === 'get' ? {task} : resource === 'tasklists' && operation === 'list'
    ? {items:[{guid:'list-1',name:'研发任务清单'}],has_more:false}
    : {items:params.page_token ? [{...task,guid:'task-2',summary:'第二页任务'}] : [task],has_more:!params.page_token,page_token:params.page_token ? undefined : 'next'}
  console.log(JSON.stringify({ok:true,identity:'user',data}))
}
`,
    { mode: 0o700 }
  )
  return { bin, ledger }
}
