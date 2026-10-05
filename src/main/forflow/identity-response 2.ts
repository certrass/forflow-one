import type { z } from 'zod'

export function parseIdentityResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new Error('身份服务返回格式不匹配，请检查服务版本。')
  }
  return result.data
}

export async function readIdentityResponse(response: Response): Promise<unknown> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('身份服务返回了空响应。')
  }
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    for (;;) {
      const result = await reader.read()
      if (result.done) {
        break
      }
      bytes += result.value.byteLength
      if (bytes > 256 * 1024) {
        await reader.cancel()
        throw new Error('身份服务响应过大。')
      }
      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('身份服务返回了无效响应。')
  }
}
