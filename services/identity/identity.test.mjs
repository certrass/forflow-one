import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { IdentityStore } from './identity-store.mjs'
import { createIdentityHttpServer } from './http-server.mjs'

const directory = mkdtempSync(join(tmpdir(), 'forflow-identity-test-'))
const password = 'test-only-Forflow-2026!'
let store
let server
let origin
let adminToken
let adminId
let memberId
let memberToken

async function request(path, { body, token, headers } = {}) {
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  return { status: response.status, body: await response.json(), headers: response.headers }
}

before(async () => {
  store = new IdentityStore(directory)
  adminId = (
    await store.createUser({
      username: 'admin',
      displayName: '测试管理员',
      role: 'admin',
      password
    })
  ).id
  server = createIdentityHttpServer(store)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
  store.close()
  rmSync(directory, { recursive: true, force: true })
})

test('private service identifies its contract, rejects browser origins and does not redirect', async () => {
  const config = await request('/v1/identity/config')
  assert.equal(config.body.product, 'Forflow One')
  assert.equal(config.body.contract, 1)
  assert.equal(config.headers.get('cache-control'), 'no-store')
  assert.equal(
    (await request('/v1/identity/config', { headers: { Origin: 'https://untrusted.test' } }))
      .status,
    403
  )
  assert.equal((await request('/v1/identity/config?token=secret')).status, 403)
  assert.equal((await request('/login')).status, 404)
})

test('password login produces an opaque session and authenticated user', async () => {
  const bad = await request('/v1/identity/login', {
    body: { username: 'admin', password: 'incorrect' }
  })
  assert.equal(bad.status, 401)
  const login = await request('/v1/identity/login', { body: { username: 'admin', password } })
  assert.equal(login.status, 200)
  assert.match(login.body.token, /^[A-Za-z0-9_-]{43}$/)
  adminToken = login.body.token
  assert.equal(
    (await request('/v1/identity/session', { token: adminToken })).body.user.displayName,
    '测试管理员'
  )
  assert.equal((await request('/v1/admin/users')).status, 401)
})

test('administrator creates users while a member cannot manage accounts', async () => {
  const created = await request('/v1/admin/users', {
    token: adminToken,
    body: { username: 'member', displayName: '中文成员', password, role: 'member' }
  })
  assert.equal(created.status, 200)
  memberId = created.body.user.id
  const login = await request('/v1/identity/login', { body: { username: 'member', password } })
  memberToken = login.body.token
  assert.equal((await request('/v1/admin/users', { token: memberToken })).status, 403)
  assert.equal(
    (
      await request('/v1/admin/users', {
        token: memberToken,
        body: { username: 'intruder', displayName: 'Denied', password, role: 'admin' }
      })
    ).status,
    403
  )
  assert.equal((await request('/v1/admin/users', { token: adminToken })).body.users.length, 2)
})

test('disabling an account revokes sessions and cannot disable the last administrator', async () => {
  assert.equal(
    (
      await request('/v1/admin/users/state', {
        token: adminToken,
        body: { id: memberId, disabled: true }
      })
    ).status,
    200
  )
  assert.equal((await request('/v1/identity/session', { token: memberToken })).status, 401)
  assert.equal(
    (await request('/v1/identity/login', { body: { username: 'member', password } })).status,
    401
  )
  assert.equal(
    (
      await request('/v1/admin/users/state', {
        token: adminToken,
        body: { id: adminId, disabled: true }
      })
    ).status,
    409
  )
  assert.equal(
    (
      await request('/v1/admin/users/state', {
        token: adminToken,
        body: { id: memberId, disabled: false }
      })
    ).status,
    200
  )
})

test('password reset revokes existing sessions and rejects the former password', async () => {
  const old = await request('/v1/identity/login', { body: { username: 'member', password } })
  const replacement = `${password}-changed`
  assert.equal(
    (
      await request('/v1/admin/users/password', {
        token: adminToken,
        body: { id: memberId, password: replacement }
      })
    ).status,
    200
  )
  assert.equal((await request('/v1/identity/session', { token: old.body.token })).status, 401)
  assert.equal(
    (await request('/v1/identity/login', { body: { username: 'member', password } })).status,
    401
  )
  const next = await request('/v1/identity/login', {
    body: { username: 'member', password: replacement }
  })
  assert.equal(next.status, 200)
  assert.equal(
    (await request('/v1/identity/logout', { token: next.body.token, body: {} })).status,
    200
  )
  assert.equal((await request('/v1/identity/session', { token: next.body.token })).status, 401)
})

test('repeated failed logins are limited without a per-process reset', async () => {
  for (let i = 0; i < 5; i += 1) {
    assert.equal(
      (await request('/v1/identity/login', { body: { username: 'missing', password } })).status,
      401
    )
  }
  assert.equal(
    (await request('/v1/identity/login', { body: { username: 'missing', password } })).status,
    429
  )
  const separate = new IdentityStore(directory)
  await assert.rejects(
    separate.login({ username: 'missing', password }),
    (error) => error.status === 429
  )
  separate.close()
})

test('identity audit is linked, immutable through SQL and contains no secrets', async () => {
  const audit = await request('/v1/admin/audit', { token: adminToken })
  assert.equal(audit.status, 200)
  assert.ok(audit.body.verification.events >= 12)
  assert.ok(!JSON.stringify(audit.body).includes(password))
  assert.ok(!JSON.stringify(audit.body).includes(adminToken))
  assert.throws(
    () => store.db.prepare("UPDATE audit_events SET body='changed' WHERE sequence=1").run(),
    /append only/
  )
  for (const row of store.db.prepare('SELECT password_hash FROM users').all()) {
    assert.match(row.password_hash, /^scrypt-v1:/)
  }
  assert.ok(!readFileSync(join(directory, 'identity.sqlite3')).includes(Buffer.from(password)))
})

test('stale authorization cannot create users after revocation during hashing', async () => {
  const pending = store.createUser(
    { username: 'must-not-exist', displayName: 'Denied', password, role: 'member' },
    adminId,
    'race-test',
    () => {
      throw new Error('revoked')
    }
  )
  await assert.rejects(pending, /revoked/)
  assert.equal(
    store.listUsers().some((user) => user.username === 'must-not-exist'),
    false
  )
})

test('password policy and malformed JSON fail with a client error', async () => {
  assert.equal(
    (
      await request('/v1/admin/users', {
        token: adminToken,
        body: { username: 'invalid', displayName: '失败用例', password: 'short', role: 'member' }
      })
    ).status,
    400
  )
  const response = await fetch(`${origin}/v1/identity/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{'
  })
  assert.equal(response.status, 400)
  assert.equal(
    store.listUsers().some((user) => user.username === 'invalid'),
    false
  )
})

test('idle and absolute expiry are enforced server-side and data is tenant-bound', async () => {
  const path = mkdtempSync(join(tmpdir(), 'forflow-expiry-'))
  let now = Date.now()
  const expiring = new IdentityStore(path, { now: () => now, tenant: 'expiry-test' })
  try {
    await expiring.createUser({
      username: 'expiry',
      displayName: '过期测试',
      password,
      role: 'admin'
    })
    let login = await expiring.login({ username: 'expiry', password })
    now += 30 * 60 * 1000
    assert.throws(
      () => expiring.authenticate(login.token),
      (error) => error.status === 401
    )
    login = await expiring.login({ username: 'expiry', password })
    for (let i = 0; i < 23; i += 1) {
      now += 10 * 60 * 1000
      expiring.authenticate(login.token)
    }
    now += 10 * 60 * 1000
    assert.throws(
      () => expiring.authenticate(login.token),
      (error) => error.status === 401
    )
    assert.throws(() => new IdentityStore(path, { tenant: 'different' }), /租户/)
  } finally {
    expiring.close()
    rmSync(path, { recursive: true, force: true })
  }
})

test('audit modification is detected even if database owner bypasses append-only triggers', async () => {
  const path = mkdtempSync(join(tmpdir(), 'forflow-tamper-'))
  const tampered = new IdentityStore(path)
  try {
    tampered.audit('fixture', 'test', 'test', 'success', 'test-request')
    tampered.db.exec(
      "DROP TRIGGER audit_no_update; UPDATE audit_events SET body='tampered' WHERE sequence=1"
    )
    assert.throws(() => tampered.verifyAudit(), /完整性/)
  } finally {
    tampered.close()
    rmSync(path, { recursive: true, force: true })
  }
})
