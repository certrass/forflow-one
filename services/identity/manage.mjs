import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { IdentityStore } from './identity-store.mjs'

const { values, positionals } = parseArgs({
  options: { data: { type: 'string' }, tenant: { type: 'string' } },
  allowPositionals: true
})
if (
  !values.data ||
  !['bootstrap', 'users', 'verify-audit', 'reset-password'].includes(positionals[0])
) {
  throw new Error(
    '用法：node services/identity/manage.mjs --data 数据目录 bootstrap|users|verify-audit|reset-password；账号和密码 JSON 从标准输入读取。'
  )
}
const store = new IdentityStore(values.data, { tenant: values.tenant })
try {
  switch (positionals[0]) {
    case 'bootstrap': {
      if (store.listUsers().length) {
        throw new Error('此部署已有账号，请由现有管理员新增账号。')
      }
      const input = JSON.parse(readFileSync(0, 'utf8'))
      const user = await store.createUser({ ...input, role: 'admin' })
      console.log(JSON.stringify({ created: user }, null, 2))
      break
    }
    case 'reset-password': {
      const input = JSON.parse(readFileSync(0, 'utf8'))
      await store.resetPassword(input.id, input.password, 'local-admin')
      console.log('密码已重置，旧会话已全部撤销。')
      break
    }
    case 'users':
      console.log(JSON.stringify(store.listUsers(), null, 2))
      break
    case 'verify-audit':
      console.log(JSON.stringify(store.verifyAudit(), null, 2))
      break
  }
} finally {
  store.close()
}
