export type GpuAccelerationAboutPanelOptions = {
  appName: string
  appVersion: string
  platform: NodeJS.Platform
  gpuFallbackActive: boolean
  gpuFeatureStatus: Pick<Electron.GPUFeatureStatus, 'gpu_compositing'> | null
  translate?: (key: string, fallback: string) => string
  description?: string
}

export function describeGpuAcceleration(
  gpuFeatureStatus: Pick<Electron.GPUFeatureStatus, 'gpu_compositing'> | null,
  gpuFallbackActive: boolean,
  translate = (_key: string, fallback: string): string => fallback
): string {
  if (gpuFallbackActive) {
    return translate('forflow.about.safeGraphics', 'Disabled (Safe Graphics Mode)')
  }

  const compositing = gpuFeatureStatus?.gpu_compositing.trim().toLowerCase()
  if (!compositing || compositing === 'undefined') {
    return translate('forflow.about.unknownStatus', 'Status unavailable')
  }
  if (compositing === 'enabled') {
    return translate('forflow.about.enabled', 'Enabled')
  }
  if (compositing.includes('software')) {
    return translate('forflow.about.software', 'Software rendering')
  }
  if (compositing.startsWith('disabled')) {
    return translate('forflow.about.disabled', 'Disabled')
  }
  if (compositing.startsWith('unavailable')) {
    return translate('forflow.about.unavailable', 'Unavailable')
  }
  return `${translate('forflow.about.unknown', 'Unknown')} (${compositing})`
}

export function createGpuAccelerationAboutPanelOptions({
  appName,
  appVersion,
  platform,
  gpuFallbackActive,
  gpuFeatureStatus,
  translate = (_key, fallback) => fallback,
  description
}: GpuAccelerationAboutPanelOptions): Electron.AboutPanelOptionsOptions {
  const status = `${translate('forflow.about.gpu', 'GPU acceleration')}: ${describeGpuAcceleration(gpuFeatureStatus, gpuFallbackActive, translate)}`
  const credits = [description, status].filter(Boolean).join('\n')
  return {
    applicationName: appName,
    applicationVersion: appVersion,
    ...(platform === 'linux' ? { copyright: credits } : { credits })
  }
}
