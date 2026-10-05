import { test, expect } from '@stablyai/playwright-test'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { launch, evidence, packageFingerprint } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

test('disabled automation CRUD honors its saved timezone without executing an agent', async () => {
  const profile = privateProfile('automation-timezone')
  const { app, page, errors } = await launch(profile)
  try {
    const workspace = await addPrivateProject(page, profile)
    const result = await page.evaluate(async (workspace) => {
      const call = async (method: string, params: unknown) => {
        const response = await window.api.runtime.call({ method, params })
        if (!response.ok) {
          throw new Error(JSON.stringify(response))
        }
        return response.result
      }
      const readAutomation = (result: unknown) => {
        if (!result || typeof result !== 'object' || !('automation' in result)) {
          throw new Error('Missing automation response')
        }
        const automation = result.automation
        if (
          !automation ||
          typeof automation !== 'object' ||
          !('id' in automation) ||
          typeof automation.id !== 'string' ||
          !('nextRunAt' in automation) ||
          typeof automation.nextRunAt !== 'number' ||
          !('timezone' in automation) ||
          typeof automation.timezone !== 'string' ||
          !('enabled' in automation) ||
          automation.enabled !== false
        ) {
          throw new Error('Invalid or unexpectedly enabled test automation')
        }
        return { id: automation.id, nextRunAt: automation.nextRunAt, timezone: automation.timezone }
      }
      const before = Date.now()
      const created = readAutomation(
        await call('automation.create', {
          name: 'Forflow disabled timezone regression',
          prompt: 'Disabled local test fixture; never execute.',
          agentId: 'codex',
          workspace,
          workspaceMode: 'existing',
          timezone: 'UTC',
          rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0',
          dtstart: before,
          enabled: false
        })
      )
      let updated: ReturnType<typeof readAutomation>
      let deleted: unknown
      try {
        updated = readAutomation(
          await call('automation.update', {
            id: created.id,
            updates: { timezone: 'Asia/Shanghai' }
          })
        )
      } finally {
        deleted = await call('automation.delete', { id: created.id })
      }
      if (
        !deleted ||
        typeof deleted !== 'object' ||
        !('removed' in deleted) ||
        deleted.removed !== true
      ) {
        throw new Error('Disabled test automation was not removed')
      }
      return { before, after: Date.now(), created, updated }
    }, workspace)
    writeFileSync(
      path.join(evidence, 'automation-timezone.json'),
      JSON.stringify(
        {
          packageFingerprint,
          ...result,
          errors,
          execution: 'disabled throughout; removed after CRUD'
        },
        null,
        2
      )
    )
    for (const [record, expectedHour] of [
      [result.created, 9],
      [result.updated, 1]
    ] as const) {
      expect(new Date(record.nextRunAt).getUTCHours()).toBe(expectedHour)
      expect(new Date(record.nextRunAt).getUTCMinutes()).toBe(0)
      expect(record.nextRunAt).toBeGreaterThan(result.before)
      expect(record.nextRunAt).toBeLessThanOrEqual(result.after + 24 * 60 * 60 * 1000)
    }
    expect(errors).toEqual([])
  } finally {
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
  }
})
