import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export function createAilyCliFixture(profile: string) {
  const bin = path.join(profile, 'aily-bin')
  const ledger = path.join(profile, 'aily-calls.jsonl')
  const messages = path.join(profile, 'aily-messages.json')
  mkdirSync(bin)
  writeFileSync(ledger, '')
  writeFileSync(
    messages,
    JSON.stringify([
      {
        message_id: 'om_start',
        content: '帮我整理产品评审会的准备事项。',
        sender: { id: 'ou_fixture', sender_type: 'user' }
      },
      {
        message_id: 'om_reply',
        content:
          '可以按这三项准备：\n\n1. **明确评审目标**：确认本轮需要决定的问题。\n2. **汇总评审材料**：产品方案、体验截图和待确认事项。\n3. **安排下一步**：在会上明确负责人和完成时间。\n\n你可以继续补充本次评审的背景。',
        sender: { id: 'cli_partner', sender_type: 'app' }
      }
    ])
  )
  writeFileSync(
    path.join(bin, 'lark-cli'),
    `#!${process.execPath}
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(${JSON.stringify(ledger)}, JSON.stringify(args) + '\\n')
const value = (key) => args[args.indexOf(key) + 1]
const success = (data) => console.log(JSON.stringify({ok:true,identity:'user',data}))
if (args.includes('auth')) {
  console.log(JSON.stringify({appId:'cli_fixture',brand:'feishu',identities:{user:{status:'ready',openId:'ou_fixture',scope:'im:message.send_as_user'}}}))
} else if (args.includes('+chat-list')) {
  success({chats:[{chat_id:'oc_notices',name:'豆包工作伙伴',chat_mode:'p2p'},{chat_id:'oc_partner',name:'示例用户的智能伙伴',chat_mode:'p2p'}],has_more:false})
} else if (args.includes('+chat-members-list')) {
  success({bots:[{app_id:'cli_partner',member_id:'ou_partner',name:'示例用户的智能伙伴'}]})
} else if (args.includes('+chat-messages-list')) {
  if (value('--chat-id') !== 'oc_partner') process.exit(2)
  const all = JSON.parse(fs.readFileSync(${JSON.stringify(messages)}, 'utf8'))
  const earlier = args.includes('--page-token')
  success({messages: earlier ? [{message_id:'om_earlier',content:'上次评审已完成。',sender:{id:'cli_partner',sender_type:'app'}}] : all.toReversed(),has_more:!earlier,page_token:earlier ? '' : 'earlier'})
} else if (args.includes('+messages-send')) {
  if (value('--chat-id') !== 'oc_partner' || value('--as') !== 'user') process.exit(2)
  const all = JSON.parse(fs.readFileSync(${JSON.stringify(messages)}, 'utf8'))
  const id = 'om_' + value('--idempotency-key')
  if (!all.some(m => m.message_id === id)) {
    all.push({message_id:id,content:value('--text'),sender:{id:'ou_fixture',sender_type:'user'}})
    all.push({message_id:id+'_reply',content:'已整理成会议议程：目标确认、方案讨论、行动项安排。',sender:{id:'cli_partner',sender_type:'app'}})
    fs.writeFileSync(${JSON.stringify(messages)}, JSON.stringify(all))
  }
  success({message_id:id})
} else process.exit(2)
`,
    { mode: 0o700 }
  )
  return { bin, ledger }
}
