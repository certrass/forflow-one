#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function validateModelEndpoint(value, profile) {
  const url = new URL(value)
  if (!['cn-api', 'intranet'].includes(profile)) {
    throw new Error('INVALID_PROFILE')
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    url.protocol !== 'https:' &&
    !(profile === 'intranet' && loopback && url.protocol === 'http:')
  ) {
    throw new Error('HTTPS_REQUIRED')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('INVALID_ENDPOINT')
  }
  if (
    profile === 'cn-api' &&
    url.hostname !== 'dashscope.aliyuncs.com' &&
    !/^[a-z0-9-]+\.cn-beijing\.maas\.aliyuncs\.com$/.test(url.hostname)
  ) {
    throw new Error('EXPECTED_ALIYUN_BEIJING_ENDPOINT')
  }
  return new URL(`${url.href.replace(/\/+$/, '')}/chat/completions`)
}

async function boundedJson(response) {
  if (!response.body) {
    throw new Error('EMPTY_BODY')
  }
  const reader = response.body.getReader()
  const chunks = []
  let bytes = 0
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) {
      break
    }
    bytes += chunk.value.length
    if (bytes > 1024 * 1024) {
      await reader.cancel()
      throw new Error('RESPONSE_TOO_LARGE')
    }
    chunks.push(Buffer.from(chunk.value))
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export async function runModelProbe(env = process.env, profile = 'cn-api') {
  const base = {
    profile,
    scope: 'Single non-streaming text request; no tools or customer data',
    verifiedAt: new Date().toISOString()
  }
  const missing = ['FORFLOW_MODEL_BASE_URL', 'FORFLOW_MODEL_ID'].filter((key) => !env[key])
  const apiKey =
    env.FORFLOW_MODEL_API_KEY || (profile === 'cn-api' ? env.DASHSCOPE_API_KEY : undefined)
  if (!apiKey) {
    missing.push('FORFLOW_MODEL_API_KEY')
  }
  if (missing.length) {
    return { ...base, status: 'not-run', missing }
  }
  let endpoint
  try {
    endpoint = validateModelEndpoint(env.FORFLOW_MODEL_BASE_URL, profile)
  } catch {
    return { ...base, status: 'invalid-configuration' }
  }
  const start = performance.now()
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: env.FORFLOW_MODEL_ID,
        messages: [{ role: 'user', content: '请只回复：连接成功' }],
        max_tokens: 32,
        stream: false
      })
    })
    if (!response.ok) {
      await response.body?.cancel()
      return { ...base, status: 'http-error', httpStatus: response.status }
    }
    const body = await boundedJson(response)
    const hasText =
      typeof body.choices?.[0]?.message?.content === 'string' &&
      body.choices[0].message.content.trim().length > 0
    const usage = Object.fromEntries(
      ['prompt_tokens', 'completion_tokens', 'total_tokens']
        .filter((key) => Number.isFinite(body.usage?.[key]) && body.usage[key] >= 0)
        .map((key) => [key, body.usage[key]])
    )
    return {
      ...base,
      status: hasText ? 'passed' : 'invalid-response',
      httpStatus: response.status,
      elapsedMs: Math.round(performance.now() - start),
      usage
    }
  } catch {
    // Error bodies/URLs can contain credentials; diagnostics expose a category only.
    return {
      ...base,
      status: 'transport-or-response-error',
      elapsedMs: Math.round(performance.now() - start)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const envFile = resolve(import.meta.dirname, '../../.forflow/model.env')
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile)
  }
  const profile = process.argv.includes('--intranet') ? 'intranet' : 'cn-api'
  const result = await runModelProbe(process.env, profile)
  const evidence = resolve(import.meta.dirname, '../../.forflow/evidence')
  mkdirSync(evidence, { recursive: true, mode: 0o700 })
  writeFileSync(resolve(evidence, 'model-probe.json'), `${JSON.stringify(result, null, 2)}\n`, {
    mode: 0o600
  })
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.status === 'passed' ? 0 : 2
}
