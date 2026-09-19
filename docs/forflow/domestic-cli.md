# 国内 CLI 接入：产品、命令与验证边界

核对日期：2026-09-19。用户指定豆包、WorkBuddy、阿里 QoderWork 作为候选后，本轮把首批执行器从“暂选 OpenCode”调整为 **CodeBuddy、Qoder CN 和既有 TRAE CN 路线**。API 探针继续用于验证模型接口，不能代替 CLI 的端到端验收。

## 先把产品和执行入口对应起来

| 用户提到的产品 | 已核对的官方入口 | 在 Forflow One 中的位置 | 本轮状态 |
| --- | --- | --- | --- |
| WorkBuddy | 腾讯 CodeBuddy Code CLI：`codebuddy`；npm 包 `@tencent-ai/codebuddy-code` | 可交互编程执行器。WorkBuddy 桌面与独立 CLI 分开检测；不能把桌面应用存在当作 CLI 已装好 | 已加 CLI 检测、菜单、初始任务和进程识别；待实际 CLI 登录与执行验收 |
| QoderWork | Qoder CN CLI：`qodercn` | 国内账号与国内运行入口；保留 `qoder-cn` 独立 ID，不能混入国际版 `qoder` 或历史 `qodercli` | 已加国内 CLI 适配；用 `--prompt-interactive` 保持交互，待二进制实测 |
| 豆包／火山 | 火山官方 `arkcli`，包 `@volcengine/ark-cli` | 模型、多模态、推理接入点与云服务工具。适合受控工具 adapter；不是另一套完整编程 TUI | 已明确接口边界，未虚构“doubao”编程命令，也未加入 TUI 列表 |
| 字节编程 Agent | TRAE CN：`traecli` | 编程执行器；不能等同于选定豆包模型或已完成内网部署 | 上游已有交互启动定义，国内构建优先显示；厂商实测待进行 |
| 阿里／月之暗面及其他 | `qwen`、`kimi`、`mimo`、`opencode` | 复用已有执行器；模型、地域和费用独立配置 | 上游已有部分支持，保留为候选和内网兼容路径 |

依据：[CodeBuddy CLI](https://www.codebuddy.cn/docs/cli/cli-reference)、[CodeBuddy 安装](https://www.codebuddy.cn/docs/cli/installation)、[Qoder CN 命令](https://docs.qoder.cn/cli/cli-reference)、[QoderWork 产品说明](https://docs.qoder.com/qoderwork/quick-start)、[火山 ark-cli 源码](https://github.com/volcengine/ark-cli)、[TRAE CN 参数](https://docs.trae.cn/cli_command-line-parameters)。QoderWork 产品页面用于辨认桌面产品，实际接入使用国内 CLI 文档与命令，不沿用国际版账号假设。

本机已有 `/Applications/WorkBuddy.app`，但 PATH 检查没有发现 `codebuddy`、`qodercn` 等独立执行命令。本轮没有借用桌面应用内部的未公开命令、账户或密钥。官方 npm 元数据返回 CodeBuddy `2.155.0`，命令别名包括 `cbc`、`codebuddy-code`；这是发现记录，尚未成为本项目锁定或分发的执行器版本。

## 已写入代码的适配

- `src/shared/tui-agent.ts / tui-agent-config.ts`：新增 `codebuddy`、`qoder-cn`，CLI 检测在实际执行主机进行；未把 WorkBuddy/QoderWork 桌面名当可执行命令。
- `tui-agent-startup.ts` 复用既有引号、跨平台和提示词注入机制。CodeBuddy 任务放在 `--` 后；Qoder CN 用 `--prompt-interactive`。Linux/macOS 与 PowerShell 的提示词字面值均有合同测试；未宣称 Windows 原生执行通过。
- `codebuddy-command-mode.ts / qoder-cn-command-mode.ts`：区分交互、print、ACP 等模式；一次性任务、Qoder 的位置参数任务不作为可再次注入提示词的交互进程。
- Agent 目录、自动选择、显示名称和事件枚举补齐；Forflow 构建优先国内候选，已明确选择的执行器仍优先；没有已安装国内候选时保持空选择，不自动回退到其他厂商；未安装的候选不会假装已安装。
- 新 Forflow 配置为两个新增执行器设置 `--permission-mode default`。CodeBuddy 默认关闭产品遥测、错误上报、自动更新和反馈发送。它们是启动配置，后续仍需受管 profile 和网络层约束。
- Agent 图标在 Forflow 构建中不再回退到 Google favicon 请求；没有本地图标时使用现有字母图标。
- 第三方 CLI 的名称、真实命令和来源保留；Forflow One 是工作台与治理层的品牌，不把厂商 CLI 改名冒充自研。

这一级适配可以让独立 CLI 被发现并得到正确的启动命令，**尚未形成已验证的供应商端到端执行链**。本轮不写依赖厂商终端画面的猜测规则；首次接入时先录制经脱敏的真实终端转录，再补等待、权限、完成和恢复的识别。

## 本地联调配置与客户部署配置

CodeBuddy 的 `CODEBUDDY_CONFIG_DIR` 可将配置与 WorkBuddy 分开；模板见 `resources/forflow/codebuddy.env.example`。第一次登录应在该执行环境中选择国内站或客户的企业域。不复制已有 WorkBuddy 账户配置。四个禁用变量的实际效果要在固定 CLI 版本上通过出站记录复验。[安装与目录](https://www.codebuddy.cn/docs/cli/installation)、[登录选项](https://www.codebuddy.cn/docs/cli/quickstart)、[环境变量](https://www.codebuddy.cn/docs/cli/env-vars)、[权限模式](https://www.codebuddy.cn/docs/cli/permission-modes)

Qoder CN 用 `--config-dir` 指向执行主机的受管目录；模板 `resources/forflow/qoder-cn.settings.example.json` 关闭自动升级。登录、VPC、自定义模型和配置合并的实际效果按客户的服务版本验收。`--permission-mode default` 保留原生确认，但不能代替企业角色、业务审批或 OS 隔离。[设置](https://docs.qoder.cn/cli/settings-reference)、[安装与升级](https://docs.qoder.cn/cli/installation)、[权限](https://docs.qoder.cn/cli/permissions)

模板目前不会自动写入用户的第三方目录。固定企业 profile 应记录 `agent_id / version / binary_digest / auth_mode / config_directory / model_provider / region / endpoint / credential_ref / allowed_tools / egress_policy_version`。路径来自执行主机；不能把本机绝对路径直接传给 SSH worker。

“国内站”与“完全离线私有化”应分别验收。厂商登录、模型路由、计费、自动下载、插件、遥测均可能有独立服务；客户内网模型可继续采用已验证的兼容执行器路径，不能仅凭产品属于国内厂商就声明无公网依赖。

## 会话历史与界面入口

`.6` 已增加国内产品接入导航和主机 CLI 检测说明，但 CodeBuddy／Qoder CN 尚无历史读取器，WorkBuddy／QoderWork 桌面会话也未导入。用户截图中的历史筛选与启动目录分开维护，详见 [本版说明](release-1.4.205-forflow.6.md)。

## 接下来按这四步完成真实执行链

1. **固定与识别**：在隔离目录准备厂商 CLI 的确定版本、许可、哈希和安装来源；验证 PATH、别名、`--help`、配置目录、国内登录和权限默认值。先不接客户数据。
2. **交互任务**：合成仓库内读取文件、提出补丁、运行测试、查看差异、拒绝一次写入、取消任务、恢复会话。保留命令、进程退出、产物与测试回执。缺 CLI 或认证失败必须在界面呈现真实原因。
3. **结构化 adapter**：分别核对 CodeBuddy/Qoder 的 JSON/stream-json、ACP 或 SDK。把权限请求、工具开始/结果、用量、取消和失败映射到统一事件；不能以终端截图冒充完整工具事件。遇到客户端断线保留“无法确认”，向执行主机查询。
4. **治理与辅助生成**：统一 `run_id` 与证据引用后再接治理模块。提交说明、分支命名、标题、自动审阅等后台调用独立登记 provider；TUI 已换为国内 CLI 不意味着这些调用自动换好了。

火山 `arkcli` 另走受控工具路径：文本、多模态调用与接入点管理采用不同权限；第一批只做最小文本或只读能力，创建/删除云端资源不随 Agent 默认放行。安装 Skills 的 `+connect` 不属于本轮执行内容。
