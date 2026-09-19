import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derive = promisify(scrypt)
const parameters = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }

export function validatePassword(password) {
  if (typeof password !== 'string' || [...password].length < 12 || password.length > 256) {
    throw new PasswordPolicyError('密码须为 12 至 256 个字符。')
  }
}

export class PasswordPolicyError extends Error {}

export async function hashPassword(password) {
  validatePassword(password)
  const salt = randomBytes(32).toString('hex')
  const hash = await derive(password, salt, 64, parameters)
  return `scrypt-v1:${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256) {
    return false
  }
  const [version, salt, expected] = encoded.split(':')
  if (
    version !== 'scrypt-v1' ||
    !/^[a-f0-9]{64}$/.test(salt) ||
    !/^[a-f0-9]{128}$/.test(expected)
  ) {
    throw new Error('账号凭据格式无效。')
  }
  const actual = await derive(password, salt, 64, parameters)
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'))
}

// Unknown users pay the same password derivation cost as existing users.
export const DUMMY_PASSWORD_HASH = `scrypt-v1:${'0'.repeat(64)}:${'0'.repeat(128)}`
