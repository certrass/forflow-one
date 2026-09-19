import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isForflowBuild } from '../../shared/product-branding'

export function resolveMacOSComputerUseAppPath(): string | null {
  const override = process.env.ORCA_COMPUTER_MACOS_HELPER_APP_PATH
  if (override && existsSync(override)) {
    return override
  }

  const appName = isForflowBuild() ? 'Forflow One 电脑操作.app' : 'Orca Computer Use.app'
  const packaged = [join(process.resourcesPath ?? '', appName)]
  const dev = [
    join(process.cwd(), 'native/computer-use-macos/.build/release', appName),
    resolve(__dirname, '../../native/computer-use-macos/.build/release', appName)
  ]
  const candidates = process.resourcesPath ? [...packaged, ...dev] : dev

  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null
}

export function resolveMacOSComputerUseExecutablePath(): string | null {
  const appPath = resolveMacOSComputerUseAppPath()
  if (!appPath) {
    return null
  }
  const executablePath = join(
    appPath,
    'Contents',
    'MacOS',
    isForflowBuild() ? 'forflow-computer-use-macos' : 'orca-computer-use-macos'
  )
  return existsSync(executablePath) ? executablePath : null
}
