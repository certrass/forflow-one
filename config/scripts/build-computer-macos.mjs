import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const packagePath = path.join(repoRoot, 'native', 'computer-use-macos')
const binaryPath = path.join(packagePath, '.build', 'release', 'orca-computer-use-macos')
const forflow = process.env.FORFLOW_BUILD === '1'
const displayName = forflow ? 'Forflow One 电脑操作' : 'Orca Computer Use'
const appPath = path.join(packagePath, '.build', 'release', `${displayName}.app`)
const executableName = forflow ? 'forflow-computer-use-macos' : 'orca-computer-use-macos'
const appExecutablePath = path.join(appPath, 'Contents', 'MacOS', executableName)
const appIconPath = path.join(appPath, 'Contents', 'Resources', 'AppIcon.icns')
const entitlementsPath = path.join(
  repoRoot,
  'resources',
  'build',
  'entitlements.computer-use.mac.plist'
)
const bundleId =
  process.env.ORCA_COMPUTER_MACOS_BUNDLE_ID ??
  (forflow ? 'cn.forflow.one.computer-use' : 'com.stablyai.orca.computer-use')
const signingIdentity = resolveSigningIdentity()
const universalTriples = process.argv.includes('--single-arch')
  ? [process.arch === 'arm64' ? 'arm64-apple-macosx' : 'x86_64-apple-macosx']
  : ['arm64-apple-macosx', 'x86_64-apple-macosx']

if (process.platform !== 'darwin') {
  process.exit(0)
}

buildUniversalBinary()
chmodSync(binaryPath, 0o755)
createHelperApp()

function buildUniversalBinary() {
  const builtBinaries = universalTriples.map((triple) => {
    run('swift', ['build', '-c', 'release', '--package-path', packagePath, '--triple', triple])
    return path.join(packagePath, '.build', triple, 'release', 'orca-computer-use-macos')
  })
  mkdirSync(path.dirname(binaryPath), { recursive: true })
  if (builtBinaries.length === 1) {
    copyFileSync(builtBinaries[0], binaryPath)
  } else {
    run('lipo', ['-create', ...builtBinaries, '-output', binaryPath])
  }
}

function createHelperApp() {
  rmSync(appPath, { recursive: true, force: true })
  mkdirSync(path.dirname(appExecutablePath), { recursive: true })
  mkdirSync(path.join(appPath, 'Contents', 'Resources'), { recursive: true })
  copyFileSync(binaryPath, appExecutablePath)
  copyFileSync(
    path.join(repoRoot, 'resources', forflow ? 'forflow' : 'build', 'icon.icns'),
    appIconPath
  )
  chmodSync(appExecutablePath, 0o755)
  writeFileSync(path.join(appPath, 'Contents', 'Info.plist'), infoPlist(), 'utf8')
  const signer = spawnSync('codesign', codesignArgs(signingIdentity, appPath), { stdio: 'inherit' })
  if (signer.signal) {
    process.kill(process.pid, signer.signal)
  }
  if (signer.status !== 0) {
    process.exit(signer.status ?? 1)
  }
}

function codesignArgs(identity, targetPath) {
  const args = ['--force', '--deep', '--sign', identity]
  if (process.env.ORCA_MAC_RELEASE === '1' && identity !== '-') {
    args.push('--options', 'runtime', '--timestamp', '--entitlements', entitlementsPath)
  }
  args.push(targetPath)
  return args
}

function resolveSigningIdentity() {
  const explicitIdentity = process.env.ORCA_COMPUTER_MACOS_SIGN_IDENTITY ?? process.env.CSC_NAME
  if (explicitIdentity) {
    return explicitIdentity
  }
  const identities = spawnSync('security', ['find-identity', '-v', '-p', 'codesigning'], {
    encoding: 'utf8'
  })
  if (identities.status !== 0 || !identities.stdout) {
    return '-'
  }
  const developmentMatch = identities.stdout.match(/"([^"]*Apple Development:[^"]+)"/)
  if (process.env.ORCA_MAC_RELEASE !== '1' && developmentMatch) {
    return developmentMatch[1]
  }
  const releaseMatch =
    identities.stdout.match(/"([^"]*Developer ID Application:[^"]+)"/) ??
    identities.stdout.match(/"([^"]*Apple Distribution:[^"]+)"/)
  return releaseMatch?.[1] ?? developmentMatch?.[1] ?? '-'
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.signal) {
    process.kill(process.pid, result.signal)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function infoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>${executableName}</string>
  <key>CFBundleIdentifier</key>
  <string>${escapePlist(bundleId)}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleName</key>
  <string>${escapePlist(displayName)}</string>
  <key>CFBundleDisplayName</key>
  <string>${escapePlist(displayName)}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>14.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSAccessibilityUsageDescription</key>
  <string>${forflow ? 'Forflow One 电脑操作需要辅助功能权限，以执行你发起的应用操作任务。' : 'Orca Computer Use needs Accessibility permission to read and interact with app interfaces when you ask Orca to use apps.'}</string>
  <key>NSScreenCaptureUsageDescription</key>
  <string>${forflow ? 'Forflow One 电脑操作需要屏幕录制权限，以查看你指定的应用窗口。' : 'Orca Computer Use needs Screen Recording permission to capture app windows when you ask Orca to inspect your screen.'}</string>
</dict>
</plist>
`
}

function escapePlist(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
