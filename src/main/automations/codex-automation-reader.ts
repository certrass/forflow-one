import { open, opendir, lstat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { parse } from 'smol-toml'
import { z } from 'zod'
import type { CodexAutomationIssue, CodexAutomationList } from '../../shared/codex-automations'

const MAX_FILE_BYTES = 256 * 1024
const MAX_ENTRIES = 1000
const MAX_TOTAL_BYTES = 8 * 1024 * 1024
const automationSchema = z.object({
  version: z.number().optional(),
  id: z.string().min(1),
  name: z.string().min(1),
  prompt: z.string(),
  kind: z.string().default('cron'),
  status: z.string(),
  rrule: z.string().min(1),
  model: z.string().optional(),
  cwds: z.array(z.string()).default([]),
  target_thread_id: z.string().optional(),
  updated_at: z.number().int().nonnegative().optional()
})

function fileErrorCode(error: unknown): string | null {
  return error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : null
}

function readIssueCode(error: unknown): CodexAutomationIssue['code'] {
  const code = fileErrorCode(error)
  return code === 'EACCES' || code === 'EPERM' ? 'permission' : 'unreadable'
}

export async function readCodexAutomations(
  codexHome = process.env.CODEX_HOME?.trim() || join(homedir(), '.codex')
): Promise<CodexAutomationList> {
  const sourceDirectory = join(codexHome, 'automations')
  const result: CodexAutomationList = {
    sourceDirectory,
    status: 'ready',
    automations: [],
    issues: [],
    readAt: Date.now()
  }
  if (!isAbsolute(codexHome)) {
    return { ...result, status: 'error', issues: [{ path: sourceDirectory, code: 'invalid' }] }
  }
  let entryCount = 0
  let totalBytes = 0
  try {
    const directory = await opendir(sourceDirectory)
    for await (const entry of directory) {
      if (++entryCount > MAX_ENTRIES || totalBytes >= MAX_TOTAL_BYTES) {
        result.issues.push({ path: sourceDirectory, code: 'limit' })
        break
      }
      if (!entry.isDirectory()) {
        continue
      }
      const sourcePath = join(sourceDirectory, entry.name, 'automation.toml')
      let content: string
      try {
        const info = await lstat(sourcePath)
        if (!info.isFile()) {
          result.issues.push({ path: sourcePath, code: 'unreadable' })
          continue
        }
        const file = await open(sourcePath, 'r')
        try {
          const buffer = Buffer.alloc(MAX_FILE_BYTES + 1)
          let bytesRead = 0
          while (bytesRead < buffer.length) {
            const chunk = await file.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead)
            if (chunk.bytesRead === 0) {
              break
            }
            bytesRead += chunk.bytesRead
          }
          totalBytes += bytesRead
          if (bytesRead > MAX_FILE_BYTES) {
            result.issues.push({ path: sourcePath, code: 'oversized' })
            continue
          }
          content = buffer.subarray(0, bytesRead).toString('utf8')
        } finally {
          await file.close()
        }
      } catch (error) {
        // Codex can leave a memory-only directory after deleting a definition.
        if (fileErrorCode(error) !== 'ENOENT') {
          result.issues.push({ path: sourcePath, code: readIssueCode(error) })
        }
        continue
      }
      try {
        const parsed = parse(content)
        if (parsed.version !== undefined && parsed.version !== 1) {
          result.issues.push({ path: sourcePath, code: 'version' })
          continue
        }
        const value = automationSchema.parse(parsed)
        if (value.id !== entry.name) {
          result.issues.push({ path: sourcePath, code: 'invalid' })
          continue
        }
        result.automations.push({
          id: value.id,
          name: value.name,
          prompt: value.prompt,
          kind: value.kind,
          status: value.status,
          rrule: value.rrule,
          model: value.model ?? null,
          cwds: value.cwds,
          targetThreadId: value.target_thread_id ?? null,
          updatedAt: value.updated_at ?? null,
          sourcePath
        })
      } catch {
        // Parser errors can contain the prompt; expose only the path and category.
        result.issues.push({ path: sourcePath, code: 'invalid' })
      }
    }
  } catch (error) {
    result.status = fileErrorCode(error) === 'ENOENT' ? 'missing' : 'error'
    if (result.status === 'error') {
      result.issues.push({ path: sourceDirectory, code: readIssueCode(error) })
    }
    return result
  }
  result.automations.sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.id.localeCompare(b.id)
  )
  result.status = result.issues.length ? 'partial' : 'ready'
  return result
}
