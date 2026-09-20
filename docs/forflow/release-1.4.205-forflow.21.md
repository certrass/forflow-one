# Forflow One 1.4.205-forflow.21：Codex 自动化读取

2026-09-20，macOS arm64。补上本机 Codex 自动化来源，同时保留原有自动化管理页面。

## 使用

- **自动化 → 自动化管理**：默认打开原来的列表，保留 Forflow、Hermes、OpenClaw、搜索、筛选、新建和运行记录。
- **自动化 → Codex 任务（本机，只读）**：查看 Codex 定时任务和会话跟进，支持搜索、展开详情与刷新。Codex 继续负责调度和执行；不复制、修改或重复执行任务。
- 默认读取 `~/.codex/automations/*/automation.toml`，支持启动环境中的绝对路径 `CODEX_HOME`。不使用托管 CLI 账户或历史来源目录代替它，不把本机任务映射为 SSH 任务。
- 区分空目录、权限错误、损坏配置、未知版本与读取上限；部分错误不隐藏有效任务。配置正文不进入错误信息。仅可信桌面主窗口可调用读取 IPC。
- 简单计划显示中文说明，复杂计划保留原文；启用状态不代表正在运行，执行历史及下次触发以 Codex 为准。

详见 [Codex 自动化读取说明](codex-automations.md)。

## 验证与制品

源码提交：`9ee39dfcd1888ba268375045049f1abd1b124f1f`。

- 222 个回归文件、2,157 项测试通过；身份服务 11 项通过。类型、安装包测试类型、代码质量、React、设计系统及中文目录检查通过。
- 最终候选包 13 个 smoke 场景通过，无跳过或重试。新场景先展示原有 Forflow 和 OpenClaw 任务，再切换 Codex、搜索、展开、刷新和恢复损坏配置；返回原页后打开新建对话框及运行记录，原有任务仍在。
- 源码读取器在本机真实目录读到 8 项配置：6 项定时任务、2 项会话跟进，无读取错误；读取前后配置整体指纹一致。
- 打包 smoke 使用隐藏窗口和隔离配置。另在安装版的用户真实配置中，只读验证了 8 项 Codex 任务的列表显示和返回原管理页，读取前后任务配置整体指纹一致；回执不保存任务正文。
- 严格签名和 ZIP 解压回读通过。为本机 ad-hoc 签名，未做 Apple 公证。

候选证据：`qa/packaged-tests.json`、`qa/codex-automations.json`、`qa/automation-management-preserved.png`、`qa/codex-automations.png`。真实目录读取证据：`qa/forflow21-local-codex-read.json`。

ZIP SHA256：`9fdbd223b8ee0de9ff8803d1683c92c3a7e2b7bf26e6749e560b643cb34bcbd0`。

app.asar SHA256：`bd5e019202ac190b1ae17224625115926e02a7bdfe020188413658958263f141`。

## 安装

2026-09-20 13:49（北京时间）已安装到 `/Applications/Forflow One.app`。安装器未改写用户数据；`.20` 回退副本位于 `/Users/zezhou/Library/Caches/Forflow One/rollback/1.4.205-forflow.20-before-forflow.21/Forflow One.app`。

安装版真实 Codex 读取、列表显示及返回原管理页成功，系统 CLI 返回 `.21`，签名与 app.asar 指纹和候选包一致。证据为 `qa/forflow21-live-codex.json`、`qa/forflow21-installation.json`。

安装后 smoke 首轮为 **11 通过、2 失败**：飞书场景窗口中途关闭，文件差异场景等待列表超时。飞书专项复测通过；终端／文件专项首次复测遇到 `pty:kill: kill EPERM`，随后同一用例在 `.20` 回退版和未修改的安装版 `.21` 均通过。没有放宽断言、增加超时或修改运行时代码。13 项场景均已有安装版通过记录，但不称为首轮全过；上述间歇性异常的根因仍待定位。

原始失败与对照证据保留在 `qa/installed/`、`qa/installed-retest/`、`qa/installed-terminal-final/`、`qa/baseline20-comparison/`。本次不将无稳定复现的终端问题扩大为终止策略改造。
