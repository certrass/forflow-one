import http from 'node:http'
import https from 'node:https'
import { randomUUID } from 'node:crypto'
import { IdentityError } from './identity-store.mjs'
import { PasswordPolicyError } from './passwords.mjs'

async function readJson(request) {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json') {
    throw new IdentityError(415, '请求必须使用 JSON。')
  }
  const chunks = []
  let bytes = 0
  for await (const chunk of request) {
    bytes += chunk.length
    if (bytes > 8192) {
      throw new IdentityError(413, '请求内容过大。')
    }
    chunks.push(chunk)
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Expected a JSON object')
    }
    return value
  } catch {
    throw new IdentityError(400, '请求格式无效。')
  }
}

function bearer(request) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.authorization ?? '')
  return match?.[1] ?? ''
}

function respond(response, status, value, requestId) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'X-Request-Id': requestId
  })
  response.end(JSON.stringify(value))
}

export function createIdentityHttpServer(store, { tls, allowedOrigin } = {}) {
  let activePasswordRequests = 0
  const handler = async (request, response) => {
    const requestId = randomUUID()
    let passwordWork = false
    try {
      const url = new URL(request.url ?? '/', 'http://identity.local')
      if (url.search || (request.headers.origin && request.headers.origin !== allowedOrigin)) {
        throw new IdentityError(403, '不接受此来源的请求。')
      }
      const route = `${request.method} ${url.pathname}`
      if (route === 'GET /v1/identity/config') {
        respond(
          response,
          200,
          { product: 'Forflow One', contract: 1, tenant: store.tenant, authentication: 'password' },
          requestId
        )
        return
      }
      const mutatingRoutes = new Set([
        'POST /v1/identity/login',
        'POST /v1/identity/logout',
        'POST /v1/admin/users',
        'POST /v1/admin/users/state',
        'POST /v1/admin/users/password'
      ])
      const known =
        mutatingRoutes.has(route) ||
        route === 'GET /v1/identity/session' ||
        route === 'GET /v1/admin/users' ||
        route === 'GET /v1/admin/audit'
      if (!known) {
        throw new IdentityError(404, '接口不存在。')
      }
      passwordWork =
        route === 'POST /v1/identity/login' ||
        route === 'POST /v1/admin/users' ||
        route === 'POST /v1/admin/users/password'
      if (passwordWork) {
        if (activePasswordRequests >= 2) {
          passwordWork = false
          throw new IdentityError(429, '服务正忙，请稍后重试。')
        }
        activePasswordRequests += 1
      }
      const token = bearer(request)
      const session =
        route === 'POST /v1/identity/login'
          ? null
          : store.authenticate(token, { admin: url.pathname.startsWith('/v1/admin/') })
      const body = mutatingRoutes.has(route) ? await readJson(request) : null
      let result
      switch (route) {
        case 'POST /v1/identity/login':
          result = await store.login(body, requestId)
          break
        case 'GET /v1/identity/session':
          result = session
          break
        case 'POST /v1/identity/logout':
          store.logout(token, requestId)
          result = { success: true }
          break
        case 'GET /v1/admin/users':
          result = { users: store.listUsers() }
          break
        case 'POST /v1/admin/users':
          result = {
            user: await store.createUser(body, session.user.id, requestId, () =>
              store.authenticate(token, { admin: true })
            )
          }
          break
        case 'POST /v1/admin/users/state':
          store.authenticate(token, { admin: true })
          store.setDisabled(body.id, body.disabled, session.user.id, requestId)
          result = { success: true }
          break
        case 'POST /v1/admin/users/password':
          await store.resetPassword(body.id, body.password, session.user.id, requestId, () =>
            store.authenticate(token, { admin: true })
          )
          result = { success: true }
          break
        case 'GET /v1/admin/audit':
          result = { verification: store.verifyAudit(), events: store.auditPage() }
          break
      }
      respond(response, 200, result, requestId)
    } catch (error) {
      const status =
        error instanceof IdentityError
          ? error.status
          : error instanceof PasswordPolicyError
            ? 400
            : 500
      if (status === 403 || status === 429) {
        store.audit('request.denied', 'anonymous', 'identity-api', String(status), requestId)
      }
      const message = status === 500 ? '身份服务暂时不可用，请联系管理员。' : error.message
      respond(response, status, { error: message, requestId }, requestId)
    } finally {
      if (passwordWork) {
        activePasswordRequests -= 1
      }
    }
  }
  const server = tls
    ? https.createServer({ ...tls, minVersion: 'TLSv1.2' }, handler)
    : http.createServer(handler)
  server.requestTimeout = 10_000
  server.headersTimeout = 10_000
  server.keepAliveTimeout = 5_000
  server.maxHeadersCount = 32
  return server
}
