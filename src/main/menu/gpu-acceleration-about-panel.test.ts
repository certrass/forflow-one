import { describe, expect, it } from 'vitest'
import {
  createGpuAccelerationAboutPanelOptions,
  describeGpuAcceleration
} from './gpu-acceleration-about-panel'
import zh from '../../renderer/src/i18n/locales/zh.json'

describe('GPU acceleration About panel', () => {
  it('shows the localized product description and keeps diagnostic states readable', () => {
    const translate = (key: string, fallback: string): string => {
      const name = key.replace('forflow.about.', '')
      const entry = Object.entries(zh.forflow.about).find(([id]) => id === name)
      return entry?.[1] ?? fallback
    }
    const options = createGpuAccelerationAboutPanelOptions({
      appName: 'Forflow One',
      appVersion: '1.4.205-forflow.7',
      platform: 'darwin',
      gpuFallbackActive: true,
      gpuFeatureStatus: null,
      translate,
      description: zh.forflow.productDescription
    })
    expect(options.credits).toBe(
      '面向 AI 与研发团队的私有化智能体工作台。\n图形加速: 已关闭（安全图形模式）'
    )
    expect(describeGpuAcceleration({ gpu_compositing: 'new_status' }, false, translate)).toBe(
      '未知 (new_status)'
    )
  })
  it.each([
    ['enabled', 'Enabled'],
    ['disabled_off', 'Disabled'],
    ['disabled_software', 'Software rendering'],
    ['unavailable_software', 'Software rendering'],
    ['unavailable', 'Unavailable'],
    ['undefined', 'Status unavailable']
  ])('describes Chromium compositing status %s', (gpu_compositing, expected) => {
    expect(describeGpuAcceleration({ gpu_compositing }, false)).toBe(expected)
  })

  it('gives Safe Graphics Mode precedence over Chromium status', () => {
    expect(describeGpuAcceleration({ gpu_compositing: 'enabled' }, true)).toBe(
      'Disabled (Safe Graphics Mode)'
    )
  })

  it('reports status as unavailable until Chromium publishes GPU information', () => {
    expect(describeGpuAcceleration(null, false)).toBe('Status unavailable')
  })

  it('uses the Linux-visible copyright field', () => {
    expect(
      createGpuAccelerationAboutPanelOptions({
        appName: 'Orca',
        appVersion: '1.2.3',
        platform: 'linux',
        gpuFallbackActive: false,
        gpuFeatureStatus: { gpu_compositing: 'enabled' }
      })
    ).toEqual({
      applicationName: 'Orca',
      applicationVersion: '1.2.3',
      copyright: 'GPU acceleration: Enabled'
    })
  })

  it.each(['darwin', 'win32'] satisfies NodeJS.Platform[])('uses credits on %s', (platform) => {
    expect(
      createGpuAccelerationAboutPanelOptions({
        appName: 'Orca',
        appVersion: '1.2.3',
        platform,
        gpuFallbackActive: true,
        gpuFeatureStatus: null
      })
    ).toEqual({
      applicationName: 'Orca',
      applicationVersion: '1.2.3',
      credits: 'GPU acceleration: Disabled (Safe Graphics Mode)'
    })
  })
})
