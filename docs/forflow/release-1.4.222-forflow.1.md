# Forflow One 1.4.222-forflow.1

## 来源与范围

完整合入 Orca 稳定版 [v1.4.222](https://github.com/stablyai/orca/releases/tag/v1.4.222)，上游提交 `4bb6f2072b07c1f0664b809551f77754700570e4`，发布于 2026-10-07。Forflow 起点为 `290fcc552961005b8a91c6302d9fbb1a4d058bed`（1.4.220-forflow.14）。两个上游发行分支分叉，以共同祖先 `de8bffe24045b396212f4f63de8960ec8380ea07` 三方合并，逐项处理 50 个冲突路径，保留两侧历史。

本版沿用上游原生聊天、接续、分叉和编排。消息以执行主机的接收结果显示发送状态，重试复用已记录结果，停止指向当前实际回合；历史文件来自更新版本或损坏时保留文件并提示只读。纳入子智能体恢复、兼容远端结构化会话、OpenCode 启动与模型检测、CSV 表格编辑以及中文输入法修复。

国内版继续保留豆包、WorkBuddy 的标准智能体入口、账户信息、中文引导、任务来源与审阅材料选择，CLI 留在现有执行层。Qoder 国内版采用上游 `qoderclicn` 主命令并兼容 `qodercn`，保留交互提示与手动权限识别。补齐新版账户命令和子工作区快捷键的中文说明。

## 安装结果

2026-10-08 03:21（北京时间）已安装到 `/Applications/Forflow One.app`，macOS arm64。安装后从该目录再次完成 6 个核心场景，92 份原有配置文件在安装与复验前后哈希相同。安装时主程序已关闭；没有终止用户任务。

- 运行代码：`644fa8fbfc952abfd22f616765eef4b8c14b6cc4`。
- ASAR SHA-256：`d1e605f23796b8afd8faa742f50b1c437068eb3346cc23e23383a5ea8e55825f`。
- ZIP SHA-256：`a600c207bc86dce56a6684c18c9145cca0380ed8b0699ba82f77e0e335156a2c`。
- 候选、安装目录和 ZIP 内 ASAR 一致，严格签名及 ZIP CRC 校验通过。
- 安装包、回执、校验与截图：`~/Library/Caches/Forflow One/builds/1.4.222-forflow.1/`。
- `.14` 回退副本：`~/Library/Caches/Forflow One/rollback/1.4.220-forflow.14-before-forflow.222.1/Forflow One.app`。
- 源码位于私有仓库草稿 [PR #5](https://github.com/certrass/forflow-one/pull/5)，承接 [PR #2](https://github.com/certrass/forflow-one/pull/2)，尚未合并。

## 验证记录

- Node／CLI／Web 类型检查通过。
- 合并代码 `8481dfbc0ca4`：351 个文件、3,778 项 Forflow 回归通过；后续停止指令修复通过 3 文件／53 项专项，最终文案目录修复通过 4 文件／49 项专项。
- 72 个文件、733 项上游重点检查通过：聊天记录、送达与重试、停止、子任务恢复、旧主机兼容和 CSV 编辑。
- 真实 Claude CLI 测试已按项目规定启动：2 项离线断言通过、8 项受 CLI／登录探测门控跳过，未证明真实模型对话。
- 中文目录 16,991 个英文／中文键对应通过，547 个技术名称单独核对；英文启动目录 2,314 个必要条目覆盖检查通过。
- 相对完整上游 v1.4.222 的 991 个改动文件，代码质量门禁无新增问题。
- 回归清单更换 4 个已不存在的路径，新增启动时检查，缺路径时直接失败。Qoder 测试更新为上游命令与进程别名，保留任务文本不被 shell 执行和非交互进程不被复用的断言。

最终候选包 9 个后台 Electron 场景通过；安装目录 6 个核心场景通过，均无重试、无跳过。覆盖：

| 链路                       | 已验证的结果                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| 豆包／WorkBuddy → 原生对话 | 标准选择器、多行任务、回复、草稿保留；WorkBuddy 拒绝授权和停止                           |
| 当前会话 → 智能体协作      | 原生接续、分叉和编排示例；来源记录与目录进入草稿，取消后保留原草稿                       |
| 任务／对话 → 审阅          | 当前项目进入原有表单，选择材料，返回原对话；候选包另验证版本保存、敏感材料处置和重启恢复 |
| 结构化聊天 → 子任务        | 执行主机会话记录、子智能体显示和停止                                                     |
| 查看产出 → CSV             | 从文件树打开、筛选、取消修改、编辑保存；回读真实文件并核对 BOM 与 CRLF                   |
| 引导与账户（候选包）       | 中文引导、私有身份服务、会话撤销与恢复、上游账户端点隔离                                 |

界面验证使用隔离 HOME、模拟 CLI 和示例材料，窗口始终后台运行。另通过产品实际 `WorkBuddyAccountClient` 读取当前登录状态，约 2.1 秒完成；通过产品 `WorkBuddyConnection` 与厂商内置 CodeBuddy CLI 发起真实任务，约 14.8 秒收到“连接正常”。真实任务禁用工具和 MCP，只保存成功状态与耗时，不保存账户标识或令牌。本轮未发送飞书消息。

## 验证中修正的问题

首轮全量回归的 7 项失败已分类修复：新增 CLI 命令中文摘要、快捷键翻译、Qoder 手动权限识别，以及上游命令／别名对应的旧期望。构建曾在移动 Web 缺依赖处停止，补装锁定的 mobile 依赖后通过。

首个候选包出现 8 通过、1 失败：上游拆分取消提问与停止任务后，WorkBuddy 停止错误地发送 Escape。现按原有伙伴传输协议发送 Ctrl+C，并保留 OpenCode 的原有中断行为；同时为豆包和 WorkBuddy 增加对应断言。修复后 9 个场景通过。最后检查补齐英文启动目录遗漏的 34 个条目，重新构建、打包、安装，并复验最终包的全部 9／6 个场景；未降低断言或延长超时。

## 截图与证据

以下路径以本机成品目录 `~/Library/Caches/Forflow One/builds/1.4.222-forflow.1/` 为根：

- `qa-installed/workbuddy-native-chat.png`：标准智能体入口与原生对话。
- `qa-installed/collaboration-context-draft.png`：沿用原有接续的来源草稿。
- `qa-installed/structured-chat-child.png`：结构化聊天中的子任务。
- `qa-installed/feature-review-materials.png`：现有审阅的材料选择。
- `qa-installed/upstream-csv-edited.png`：本次导入的 CSV 编辑。
- `qa/packaged-tests.json`、`qa-installed/packaged-tests.json`：最终运行结果。
- `installation.json`、`archive-verification.json`、`proof.json`：安装、包一致性与配置校验。

过程日志在本工作树 `.forflow/evidence/upstream-1.4.222/`；首个失败候选和中间成功版本的证据独立保留，没有覆盖成最终结果。截图为示例数据，未提交进源码或上传到 GitHub。

## 当前范围

- 子智能体的完整产出尚未自动汇入审阅，现有流程仍需选择材料；本版没有新增自动比较或另一套交接机制。
- 真实 Claude 模型对话未验证；豆包本轮验证为模拟 CLI 链路，真实 WorkBuddy 收发另行通过。
- 本地 macOS 包沿用上游支持的旧 SSH 主机 Node 部署路径，未携带完整跨平台 `orcad` 模板。本轮未进行真实 SSH、Windows、Linux 或手机真机验证。移动 Web 已构建。

## 已完成的 .14 安装

本轮首先将通过验证的 `1.4.220-forflow.14` 安装至 `/Applications/Forflow One.app`。其运行代码为 `290fcc552961005b8a91c6302d9fbb1a4d058bed`，ASAR SHA-256 为 `9818b91d2f1626e688d7f2db83b3916dda6641cca03f0db18f7fd7d81abe12dc`。

3,597 项回归、8 个候选包场景和 5 个安装目录场景通过，92 份配置文件哈希未变。保留 `.13` 回退副本。安装与截图证据位于 `~/Library/Caches/Forflow One/builds/1.4.220-forflow.14/`。全部 Electron 场景使用隔离配置、后台窗口和模拟 CLI。
