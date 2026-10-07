import { afterEach, expect, it, vi } from 'vitest'
import {
  readProcessStartTimeMs,
  readProcessStartTimesMs
} from './agent-session-process-identity-probe'

afterEach(() => vi.unstubAllEnvs())

it.runIf(process.platform === 'darwin')(
  'reads the same process identity in Chinese across time zones',
  async () => {
    const started = Date.now() - process.uptime() * 1000
    vi.stubEnv('LANG', 'zh_CN.UTF-8')
    vi.stubEnv('LC_ALL', 'zh_CN.UTF-8')
    for (const zone of ['Asia/Shanghai', 'America/New_York']) {
      vi.stubEnv('TZ', zone)
      const single = await readProcessStartTimeMs(process.pid)
      const batch = await readProcessStartTimesMs([process.pid, process.pid])
      expect(single).not.toBeNull()
      if (single === null) {
        throw new Error('Missing process start time')
      }
      expect(Math.abs(single - started)).toBeLessThan(2_000)
      expect(batch).toEqual(new Map([[process.pid, single]]))
    }
  }
)
