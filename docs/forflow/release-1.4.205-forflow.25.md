# 1.4.205-forflow.25 · 已安装

2026-09-21，用户追问“咋没安装更新版呢”后完成安装。此前已通过验收，但尚未替换 `.24`；本记录补齐实际交付状态。

- 安装位置：`/Applications/Forflow One.app`。
- 安装时间：2026-09-21 22:19:52（北京时间）。
- ASAR SHA-256：`eae4747cbf0241fedc4060b83eb1121a77daf7e137ba5816b03bc66a8ad7c096`。
- 包内运行时代码对应 `296221fa118f462cdf39bec0c17aba701c1814d0`；后续工作区改动不属于本包。
- `.24` 回退副本：`~/Library/Caches/Forflow One/rollback/1.4.205-forflow.24-before-forflow.25/Forflow One.app`。

安装前先校验源包和旧安装指纹、严格签名，复制至暂存位置；通过正常退出应用完成状态保存，再替换应用。安装器没有修改用户数据、模型凭据或教程进度。安装后再次校验签名和指纹，并仅刷新本应用 LaunchServices 注册。

本版包含 Codex 风格 Analytics、PR 式 Review，以及具体执行记录的 Jev 预览、发送、人工采纳、来源定位和版本隔离。每日强度和 Token 分布保留。完整对话／研发项目输入、176 号令适用检查及敏感审阅仍属于后续开发，不计入本版已交付能力。

## 安装后验证

直接使用 `/Applications/Forflow One.app` 完成三个后台成品场景，3/3 通过、零重试：

1. Analytics → Review，问题／评论、重启回读、版本比较与确认。
2. Jev 预览／发送／人工采纳、原文定位、幂等与历史版本隔离。
3. 原使用量／费用／审计展示和每日强度、Token 分布。

另以真实用户配置启动安装版，回读 `1.4.205-forflow.25`、正确用户数据目录和中文设置，确认概览／使用分析／审阅入口及 Analytics 页面渲染。系统 `forflow --version` 同样返回新版。验证均使用后台隐藏窗口，未发送新的真实 Jev 请求；原有真实模型与中文判断验证仍见 [专项回执](jev-review-validation-20260921.md)。最终应用已重新在后台启动。

原始回执：`~/.codex/visualizations/2026/09/21/01a0c1ed-6955-7eb3-9399-278a4af2390a/review-jev/installed-v25/`，包含 `installation.json`、`packaged-tests.json`、三个功能回执及截图、`real-profile.json`。
