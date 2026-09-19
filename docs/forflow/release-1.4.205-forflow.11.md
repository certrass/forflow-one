# Forflow One 1.4.205-forflow.11

2026-09-20，macOS arm64 本机测试版。

按用户截图移除首页标题上方的 ForFlow 图形及占位，保留标题、介绍、按钮和快捷键说明。应用图标与其他页面不受影响。包含 `.10` 的 Kimi、智谱 GLM、DeepSeek 官方 API 账户功能。

验证：175 文件／1,648 项回归、11 项身份服务测试、类型检查、中文目录和改动质量门禁通过。新安装包的首页与系统品牌、官方 API 账户、首次启动 smoke、项目／终端／文件／差异／重启回归共 4 个场景通过；后台截图已核对首页无 Logo。无 Computer Use 或真实模型请求。

应用签名及包内图标检查通过。安装与 ZIP 校验结果见随包 `release.json`；源证据位于 `.forflow/evidence/forflow11-*`。

已安装至 `/Applications/Forflow One.app`，原 `.9` 保留为回退副本，用户数据未改写。安装前后 `app.asar` 哈希一致，版本及签名回读通过。安装后另行通过首页／系统品牌与首次启动 smoke 共两项复验。

`app.asar` SHA-256：`f59a9de7ed18b276ec3827ffc7de30062d8e19361812d3cb0672f86f328e00f7`。
