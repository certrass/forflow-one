const { readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { homedir } = require('node:os')
const { execFileSync } = require('node:child_process')

if (process.env.FORFLOW_BUILD !== '1') {
  throw new Error('Forflow packaging requires a FORFLOW_BUILD=1 desktop build.')
}
const base = require('./electron-builder.config.cjs')
const product = require('../resources/forflow/product.json')
const { version } = require('../resources/forflow/release-profile.json')

// This profile creates a local, ad-hoc signed Mac test release. Public release
// signing, cross-platform installers and protocol handlers have separate acceptance.
module.exports = {
  ...base,
  appId: product.appId,
  productName: product.name,
  protocols: [],
  publish: null,
  forceCodeSigning: false,
  extraMetadata: {
    name: product.packageName,
    productName: product.name,
    version,
    description: 'Forflow One 中文私有化 AI 工作台测试版'
  },
  // File Provider adds FinderInfo to bundles under synced Documents during
  // signing. Stage outside that tree; deliver the sealed ZIP separately.
  directories: {
    ...base.directories,
    output: join(homedir(), 'Library/Caches/Forflow One/builds', version)
  },
  files: [
    'out/**',
    'resources/**',
    'package.json',
    'LICENSE',
    '!node_modules/**',
    '!**/* [0-9].*',
    '!out/**/*.{test,spec}.{js,mjs,cjs}',
    '!out/**/*.map',
    '!out/electron-dev/**',
    '!out/renderer/.vite/**',
    '!resources/speech/**',
    '!resources/speech-samples/**',
    '!resources/win32/node-modules/**',
    '!resources/forflow/model.env*',
    '!resources/logo.svg',
    '!resources/icon.png',
    '!resources/icon-dev.png',
    '!resources/app-icons/**',
    '!resources/icon-source/**',
    '!resources/build/icon.*',
    '!resources/tray/orca-menu-bar*'
  ],
  mac: {
    ...base.mac,
    category: 'public.app-category.developer-tools',
    icon: 'resources/forflow/icon.icns',
    identity: '-',
    hardenedRuntime: false,
    notarize: false,
    fileAssociations: [],
    target: [{ target: 'zip', arch: ['arm64'] }],
    artifactName: 'Forflow-One-${version}-mac-arm64.${ext}',
    extendInfo: {
      ...base.mac.extendInfo,
      CFBundleDevelopmentRegion: 'zh_CN',
      CFBundleLocalizations: ['zh_CN', 'en'],
      NSAppleEventsUsageDescription:
        '在你发起电脑操作任务时，Forflow One 可通过本地工具操作其他应用。',
      NSBluetoothAlwaysUsageDescription: '在你授权的任务中，Forflow One 本地工具可能访问蓝牙设备。',
      NSBluetoothPeripheralUsageDescription:
        '在你授权的任务中，Forflow One 本地工具可能访问蓝牙设备。',
      NSCameraUsageDescription: '在你授权的任务中，Forflow One 可能使用摄像头。',
      NSLocationUsageDescription: '在你授权的任务中，Forflow One 本地工具可能读取位置信息。',
      NSLocalNetworkUsageDescription: 'Forflow One 需要连接你选择的内网模型或本地开发服务。',
      NSMicrophoneUsageDescription: 'Forflow One 使用麦克风输入语音。',
      NSAudioCaptureUsageDescription: '在你授权的任务中，Forflow One 可录制桌面音频。',
      NSDocumentsFolderUsageDescription: 'Forflow One 需要访问你选择的文稿和项目文件。',
      NSDownloadsFolderUsageDescription: 'Forflow One 需要访问你选择的下载文件。'
    },
    extraResources: base.mac.extraResources.map((resource) => {
      if (resource.to === 'bin/orca') {
        return { from: 'resources/forflow/bin/forflow', to: 'bin/forflow' }
      }
      if (resource.to === 'Orca Computer Use.app') {
        return {
          from: 'native/computer-use-macos/.build/release/Forflow One 电脑操作.app',
          to: 'Forflow One 电脑操作.app'
        }
      }
      return resource
    })
  },
  afterPack: async (context) => {
    if (context.electronPlatformName !== 'darwin' || context.arch !== 3) {
      throw new Error('This validated test-release profile supports macOS arm64 only.')
    }
    const appPath = join(context.appOutDir, `${product.name}.app`)
    // Only strip packaging metadata that codesign explicitly rejects. Never
    // remove quarantine/provenance or change the machine's Gatekeeper policy.
    for (const attribute of ['com.apple.FinderInfo', 'com.apple.ResourceFork']) {
      try {
        execFileSync('/usr/bin/xattr', ['-r', '-d', attribute, appPath], { stdio: 'pipe' })
      } catch (error) {
        if (!String(error.stderr).includes('No such xattr')) {
          throw error
        }
      }
    }
    await base.afterPack(context)
    const resources = join(context.appOutDir, `${product.name}.app`, 'Contents', 'Resources')
    const metadata = join(resources, 'orca-local-build.json')
    writeFileSync(
      metadata,
      `${JSON.stringify(
        { ...JSON.parse(readFileSync(metadata, 'utf8')), appId: product.appId },
        null,
        2
      )}\n`
    )
    require('node:fs').chmodSync(join(resources, 'bin', product.command), 0o755)
  }
}
