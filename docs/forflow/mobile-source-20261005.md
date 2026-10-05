# Forflow One 手机端 0.1.0

手机通过 Forflow One 桌面端生成的配对码连接，可查看工作区、继续会话和操作终端。首批连接方式为局域网或已有 VPN，不需要另购服务器或域名。

## 应用与设备授权

- iOS Bundle ID / Android 包名：`cn.forflow.one.mobile`；链接协议：`forflow-one-mobile://pair`。
- 设备目录使用 `forflow-one:` 命名空间，钥匙串使用 `cn.forflow.one.mobile.pairing.v0` 起的独立服务，不读取或迁移 Orca 默认凭据。
- 复用已有端到端加密、桌面授权与设备撤销机制；手机不另建密码登录，Forflow 企业账号仍在桌面端管理。
- 私有部署在桌面主进程和运行时强制本地网络配对；手机拒绝上游服务地址和云中继设备，并关闭中继发现、远程推送注册及诊断上传。
- 手机可解析旧桌面的 `orca://pair` 本地配对码；远程运行时链接继续使用原协议，未增加 RPC 字段或流操作码。

## 首次连接

1. 在包含本次配对支持的 Forflow One 桌面端打开“设置 → 手机”。
2. 选择手机可以访问的局域网或 VPN 地址，生成配对码。
3. 安装 Forflow One 手机端，选择“配对桌面端”，扫描或粘贴配对码。
4. 保持桌面端运行。需要取消授权时，在桌面设备列表撤销该手机。

手机与桌面需要网络互通。电脑地址变化后，可在桌面重新生成配对码；本版本不提供互联网中继、云推送或后台唤醒保证。

## iOS 原生构建

使用项目固定版本的 Node.js 24 和 pnpm，安装 Xcode、iOS 模拟器运行时及 CocoaPods。先在仓库根目录安装桌面依赖，再执行：

```sh
cd mobile
pnpm install --frozen-lockfile
pnpm exec expo prebuild --platform ios --no-install
cd ios
pod install
cd ..
ORCA_BACKGROUND_LAUNCH=1 CI=1 EXPO_NO_TELEMETRY=1 xcodebuild \
  -workspace ios/ForflowOne.xcworkspace -scheme ForflowOne \
  -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/ios-simulator \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  HEADER_SEARCH_PATHS="\$(inherited) \"$(pwd)/node_modules/react-native/ReactCommon\"" build
```

以上命令适用于 Apple Silicon 模拟器。模拟器也须保留本地签名，否则钥匙串保存可能因缺少应用权限失败。`HEADER_SEARCH_PATHS` 为 React Native 源码构建补充带引号的 ReactCommon 路径，避免含空格的工程目录导致头文件查找失败。真机安装需要在 Xcode 中选择自己的 Apple Team 和签名配置。

`pnpm install` 的 postinstall 会生成终端与 Mermaid WebView 资源；复用依赖目录时须先执行 `pnpm postinstall`，再运行类型检查。生成的 `ios/` 工程和 WebView 资源不提交。

两处路径修复已保留在源码中：Expo Constants 依赖补丁转义带空格的工程路径，Expo config plugin 为原生打包脚本路径补充引号。重新生成工程后仍有效，无依赖版本升级。

TestFlight 发布配置使用独立 Bundle ID、Apple 签名和仓库变量 `FORFLOW_TESTFLIGHT_GROUPS`。创建 PR 不会触发商店发布；本轮未上传 App Store Connect 或发布 Android 包。

## 验证范围

2026-10-06 在独立 PR 工作区重新运行手机 53 个测试文件 / 406 项、桌面 6 个相关测试文件 / 113 项，均通过。覆盖配对码兼容、中文设备名、凭据隔离、禁用云服务、真实 WebSocket 加密连接及撤销后拒绝重连。

2026-10-05 原生验证环境为 macOS 26.1、Xcode 26.3、iOS 26.2 SDK / 模拟器、CocoaPods 1.17.0，应用为 `0.1.0 (1)` / arm64 Release：

- 安装启动、配对及钥匙串保存通过。
- 手机向隔离桌面终端发送命令，手机画面与桌面均显示返回标记。
- 强制结束 App 后重启，无须重新配对即可恢复连接；随后新建普通终端并执行命令通过。
- “账号与隐私”文案修订后再次构建、安装并核对原生页面。
- 两处构建路径修复通过带空格、引号和普通目录共 6 个实际 shell 执行用例。

原生连接测试使用模拟器访问 `127.0.0.1` 的临时桌面运行时；真机签名安装、摄像头扫码、真实 Wi-Fi/VPN 和 Android 尚未验证。空会话首次创建及高速模拟键盘输入仍需复测。模拟器结果不代表这些路径已经通过。

2026-10-05 文案修订版模拟器安装包 SHA-256：`741ac9b99dc03a9350dd28a27754bbe615e64517fbfc82a3808c8e29399d80de`。原生构建对应的源码与 PR 代码逐文件核对；具体提交和本次检查结果见 PR 的 Testing 部分。

2026-10-06 首页和可读性后续改动见 [手机端首页与可读性](./mobile-readability-20261006.md)。上述安装包对应早期文案版本，后续构建及截图以 PR 的当前 Testing 记录为准。
