import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { IdentityStore } from './identity-store.mjs'
import { createIdentityHttpServer } from './http-server.mjs'

const host = process.env.FORFLOW_IDENTITY_HOST ?? '127.0.0.1'
const port = Number(process.env.FORFLOW_IDENTITY_PORT ?? 43120)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('身份服务端口无效。')
}
const directory = process.env.FORFLOW_IDENTITY_DATA
if (!directory) {
  throw new Error('请设置 FORFLOW_IDENTITY_DATA，指定身份与审计数据目录。')
}
const certPath = process.env.FORFLOW_IDENTITY_TLS_CERT
const keyPath = process.env.FORFLOW_IDENTITY_TLS_KEY
if (Boolean(certPath) !== Boolean(keyPath)) {
  throw new Error('TLS 证书与私钥必须同时配置。')
}
const tls =
  certPath && keyPath ? { cert: readFileSync(certPath), key: readFileSync(keyPath) } : undefined
if (!tls && !['127.0.0.1', '::1'].includes(host)) {
  throw new Error('非回环监听必须配置 TLS；也可由本机反向代理提供 HTTPS。')
}
const store = new IdentityStore(resolve(directory), {
  tenant: process.env.FORFLOW_IDENTITY_TENANT ?? 'forflow'
})
const listener = createIdentityHttpServer(store, { tls })
listener.listen(port, host, () => {
  console.log(
    `Forflow One 身份服务已启动：${tls ? 'https' : 'http'}://${host.includes(':') ? `[${host}]` : host}:${port}`
  )
})
listener.on('error', (error) => {
  console.error(`身份服务启动失败：${error.code ?? 'unknown'}`)
  store.close()
  process.exitCode = 1
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () =>
    listener.close(() => {
      store.close()
    })
  )
}
