import { DatabaseSync } from 'node:sqlite'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { chmodSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './passwords.mjs'

const SESSION_LIFETIME = 4 * 60 * 60 * 1000
const SESSION_IDLE = 30 * 60 * 1000
const sha256 = (text) => createHash('sha256').update(text).digest('hex')

export class IdentityError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function normalizeUsername(value) {
  if (typeof value !== 'string') {
    throw new IdentityError(400, '请输入账号。')
  }
  const username = value.trim().normalize('NFC').toLowerCase()
  if (!/^[\p{L}\p{N}_.@-]{3,64}$/u.test(username)) {
    throw new IdentityError(400, '账号须为 3 至 64 个文字、数字或 _.@- 字符。')
  }
  return username
}

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    disabled: row.disabled === 1
  }
}

export class IdentityStore {
  constructor(directory, { now = Date.now, tenant = 'forflow' } = {}) {
    mkdirSync(directory, { recursive: true, mode: 0o700 })
    chmodSync(directory, 0o700)
    this.db = new DatabaseSync(join(directory, 'identity.sqlite3'))
    chmodSync(join(directory, 'identity.sqlite3'), 0o600)
    this.now = now
    this.tenant = tenant
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','member')), password_hash TEXT NOT NULL,
        credential_version INTEGER NOT NULL DEFAULT 1, disabled INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, expires_at INTEGER NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT NOT NULL,
        previous_hash TEXT NOT NULL, hash TEXT NOT NULL
      );
      CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_events
        BEGIN SELECT RAISE(ABORT, 'audit events are append only'); END;
      CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_events
        BEGIN SELECT RAISE(ABORT, 'audit events are append only'); END;
      CREATE TABLE IF NOT EXISTS login_limits (
        subject TEXT PRIMARY KEY, attempts INTEGER NOT NULL, resets_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS service_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `)
    const binding = this.db.prepare("SELECT value FROM service_config WHERE key='tenant'").get()
    if (binding && binding.value !== tenant) {
      this.db.close()
      throw new Error('此数据目录已绑定其他租户，不能更改租户标识。')
    }
    this.db
      .prepare("INSERT OR IGNORE INTO service_config(key,value) VALUES('tenant',?)")
      .run(tenant)
    this.verifyAudit()
  }

  transaction(action) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = action()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  audit(action, actor, subject, outcome, requestId) {
    const previous = this.db
      .prepare('SELECT sequence, hash FROM audit_events ORDER BY sequence DESC LIMIT 1')
      .get()
    const sequence = Number(previous?.sequence ?? 0) + 1
    const previousHash = String(previous?.hash ?? '0'.repeat(64))
    const body = JSON.stringify({
      sequence,
      at: new Date(this.now()).toISOString(),
      tenant: this.tenant,
      action,
      actor,
      subject,
      outcome,
      requestId
    })
    this.db
      .prepare('INSERT INTO audit_events(sequence,body,previous_hash,hash) VALUES(?,?,?,?)')
      .run(sequence, body, previousHash, sha256(`${previousHash}\n${body}`))
  }

  verifyAudit() {
    let previousHash = '0'.repeat(64)
    let expectedSequence = 1
    for (const event of this.db.prepare('SELECT * FROM audit_events ORDER BY sequence').iterate()) {
      if (
        event.sequence !== expectedSequence ||
        event.previous_hash !== previousHash ||
        event.hash !== sha256(`${previousHash}\n${String(event.body)}`)
      ) {
        throw new Error('审计记录完整性校验失败，身份服务已停止启动。')
      }
      previousHash = String(event.hash)
      expectedSequence += 1
    }
    return { events: expectedSequence - 1, headHash: previousHash }
  }

  async createUser(input, actor = 'local-admin', requestId = randomUUID(), authorize = () => {}) {
    const username = normalizeUsername(input.username)
    const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : ''
    const role = input.role ?? 'member'
    if (!displayName || displayName.length > 80 || !['admin', 'member'].includes(role)) {
      throw new IdentityError(400, '请填写有效姓名和账号角色。')
    }
    if (this.db.prepare('SELECT id FROM users WHERE username=?').get(username)) {
      throw new IdentityError(409, '此账号已存在。')
    }
    const passwordHash = await hashPassword(input.password)
    const id = randomUUID()
    this.transaction(() => {
      authorize()
      if (this.db.prepare('SELECT id FROM users WHERE username=?').get(username)) {
        throw new IdentityError(409, '此账号已存在。')
      }
      this.db
        .prepare(
          'INSERT INTO users(id,username,display_name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)'
        )
        .run(id, username, displayName, role, passwordHash, this.now())
      this.audit('user.create', actor, id, 'success', requestId)
    })
    return publicUser(this.db.prepare('SELECT * FROM users WHERE id=?').get(id))
  }

  reserveLoginAttempt(username) {
    const subject = sha256(username)
    this.transaction(() => {
      this.db.prepare('DELETE FROM login_limits WHERE resets_at < ?').run(this.now())
      const row = this.db.prepare('SELECT * FROM login_limits WHERE subject=?').get(subject)
      if (row && row.attempts >= 5) {
        throw new IdentityError(429, '尝试次数过多，请 15 分钟后重试。')
      }
      this.db
        .prepare(`INSERT INTO login_limits(subject,attempts,resets_at) VALUES(?,1,?)
        ON CONFLICT(subject) DO UPDATE SET attempts=attempts+1`)
        .run(subject, this.now() + 15 * 60 * 1000)
    })
    return subject
  }

  async login(input, requestId = randomUUID()) {
    const username = normalizeUsername(input.username)
    const subject = this.reserveLoginAttempt(username)
    const row = this.db.prepare('SELECT * FROM users WHERE username=?').get(username)
    const valid = await verifyPassword(input.password, row?.password_hash ?? DUMMY_PASSWORD_HASH)
    const current = row ? this.db.prepare('SELECT * FROM users WHERE id=?').get(row.id) : undefined
    if (
      !valid ||
      !current ||
      current.disabled ||
      current.credential_version !== row.credential_version
    ) {
      this.audit('session.login', 'anonymous', subject, 'denied', requestId)
      throw new IdentityError(401, '账号或密码不正确，或账号已停用。')
    }
    const token = randomBytes(32).toString('base64url')
    const now = this.now()
    this.transaction(() => {
      this.db.prepare('DELETE FROM login_limits WHERE subject=?').run(subject)
      this.db
        .prepare(
          'INSERT INTO sessions(token_hash,user_id,created_at,last_seen,expires_at) VALUES(?,?,?,?,?)'
        )
        .run(sha256(token), row.id, now, now, now + SESSION_LIFETIME)
      this.audit('session.login', row.id, row.id, 'success', requestId)
    })
    return {
      token,
      user: publicUser(current),
      tenant: this.tenant,
      expiresAt: now + SESSION_LIFETIME
    }
  }

  authenticate(token, { admin = false } = {}) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new IdentityError(401, '请重新登录。')
    }
    const row = this.db
      .prepare(`SELECT users.*, sessions.expires_at, sessions.last_seen, sessions.revoked
      FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=?`)
      .get(sha256(token))
    if (
      !row ||
      row.disabled ||
      row.revoked ||
      row.expires_at <= this.now() ||
      Number(row.last_seen) + SESSION_IDLE <= this.now()
    ) {
      throw new IdentityError(401, '登录已失效，请重新登录。')
    }
    if (admin && row.role !== 'admin') {
      throw new IdentityError(403, '此操作需要管理员权限。')
    }
    this.db
      .prepare('UPDATE sessions SET last_seen=? WHERE token_hash=?')
      .run(this.now(), sha256(token))
    return { user: publicUser(row), tenant: this.tenant, expiresAt: row.expires_at }
  }

  logout(token, requestId = randomUUID()) {
    const session = this.authenticate(token)
    this.transaction(() => {
      this.db.prepare('UPDATE sessions SET revoked=1 WHERE token_hash=?').run(sha256(token))
      this.audit('session.logout', session.user.id, session.user.id, 'success', requestId)
    })
  }

  listUsers() {
    return this.db.prepare('SELECT * FROM users ORDER BY username').all().map(publicUser)
  }

  setDisabled(id, disabled, actor, requestId = randomUUID()) {
    if (typeof disabled !== 'boolean') {
      throw new IdentityError(400, '账号状态无效。')
    }
    return this.transaction(() => {
      const user = this.db.prepare('SELECT * FROM users WHERE id=?').get(id)
      if (!user) {
        throw new IdentityError(404, '账号不存在。')
      }
      const admins = this.db
        .prepare("SELECT count(*) AS count FROM users WHERE role='admin' AND disabled=0")
        .get()
      if (disabled && user.role === 'admin' && !user.disabled && admins.count <= 1) {
        throw new IdentityError(409, '不能停用最后一个管理员。')
      }
      this.db.prepare('UPDATE users SET disabled=? WHERE id=?').run(disabled ? 1 : 0, id)
      if (disabled) {
        this.db.prepare('UPDATE sessions SET revoked=1 WHERE user_id=?').run(id)
      }
      this.audit(disabled ? 'user.disable' : 'user.enable', actor, id, 'success', requestId)
    })
  }

  async resetPassword(id, password, actor, requestId = randomUUID(), authorize = () => {}) {
    const hash = await hashPassword(password)
    this.transaction(() => {
      authorize()
      const result = this.db
        .prepare(
          'UPDATE users SET password_hash=?,credential_version=credential_version+1 WHERE id=?'
        )
        .run(hash, id)
      if (result.changes !== 1) {
        throw new IdentityError(404, '账号不存在。')
      }
      this.db.prepare('UPDATE sessions SET revoked=1 WHERE user_id=?').run(id)
      this.audit('user.password-reset', actor, id, 'success', requestId)
    })
  }

  auditPage() {
    return this.db
      .prepare(
        'SELECT sequence,body,previous_hash,hash FROM audit_events ORDER BY sequence DESC LIMIT 100'
      )
      .all()
  }

  close() {
    this.db.close()
  }
}
