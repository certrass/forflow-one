import { afterEach, describe, expect, it, vi } from 'vitest'
import { runProcess } from '../../shared/child-process/run-process'
import { getCompanionCliPathRestore } from './companion-cli-shell-path'

afterEach(() => vi.unstubAllGlobals())

describe('companion CLI shell path', () => {
  it('leaves upstream shell templates unchanged', () => {
    vi.stubGlobal('FORFLOW_BRAND_ENABLED', false)
    expect(getCompanionCliPathRestore()).toBe('')
  })
  it.skipIf(process.platform === 'win32')(
    'restores the owning bundle after a profile rewrites PATH',
    async () => {
      vi.stubGlobal('FORFLOW_BRAND_ENABLED', true)
      const result = await runProcess({
        program: '/bin/sh',
        args: ['-c', `PATH=/usr/bin:/bin; ${getCompanionCliPathRestore()}printf '%s' "$PATH"`],
        env: { ...process.env, FORFLOW_CLI_BIN_DIR: '/tmp/Forflow One.app/bin' }
      })
      expect(result.stdout).toBe('/tmp/Forflow One.app/bin:/usr/bin:/bin')
    }
  )
})
