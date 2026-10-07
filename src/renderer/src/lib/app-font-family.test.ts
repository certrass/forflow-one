import { describe, expect, it } from 'vitest'
import { buildAppFontFamily } from './app-font-family'

describe('buildAppFontFamily', () => {
  it('defaults to the bundled app font', () => {
    expect(buildAppFontFamily('')).toBe(
      '"Geist", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    )
  })

  it('places a custom UI font before the fallback chain', () => {
    expect(buildAppFontFamily('Inter')).toBe(
      '"Inter", "Geist", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    )
  })

  it('does not duplicate the bundled font when selected explicitly', () => {
    expect(buildAppFontFamily('Geist')).toBe(
      '"Geist", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    )
  })
})
