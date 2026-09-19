# Orca 1.4.205 源码审计

固定基线：`11aba8bdc5e492d3ba01fc7fe333495ace74128f`。方法是版本比对、目录/依赖/语言/域名静态盘点、关键入口到调用点的追踪，以及本次改动测试；没有声称逐行审过全部仓库，也没有执行客户环境渗透或全进程网络取证。

## 仓库结构及复用范围

首次盘点：26,322 个 tracked 文件；src 21,913，mobile 2,068，cloud 480，config 615，tests 778，native 40。统计包含测试及部分生成文件，不能等同于独立业务模块数。

| 层 | 真实入口／机制 | Forflow 处理 |
| --- | --- | --- |
| 桌面启动与构建 | `electron.vite.config.ts`、`src/main/index.ts`、`src/main/startup/`、`config/electron-builder.config.cjs` | 沿用 Electron 主进程，品牌和私有策略形成有限补丁，保留上游更新能力 |
| 专业工作台 | `src/renderer/src/App.tsx`、`components/sidebar/`、`components/terminal-pane/`、`components/editor/` | 复用仓库、工作区、任务、终端和审阅；治理入口后接到同一任务上下文 |
| 主进程通信 | `src/preload/`、`src/main/ipc/`、`src/main/runtime/rpc/` | IPC 与远程 RPC 是不同通路，控制点不能只放 React UI 或 IPC |
| 执行层 | `src/main/runtime/`、`src/main/daemon/`、`src/shared/tui-agent-config.ts` | 保留 PTY、恢复、SSH、本地／远程归属；另建企业 runtime adapter |
| 结构化 Agent | `src/main/claude/`、`src/main/codex/`、Agent hook 路径 | 各家协议并不等价；Claude SDK、Codex app-server 不能直接改名冒充国内执行器 |
| 编排状态 | `src/main/runtime/orchestration/db/schema/` | 已有 runs、messages、deliveries、mutation_receipts、attempt_observation_facts；消费为运行事实，不替代企业审计 |
| 状态保存 | `src/main/persistence/`、`src/shared/constants.ts` | JSON 状态、工作区配置、运行元数据、SQLite 分开管理；先隔离后迁移 |
| 插件与资产 | `src/main/plugins/`、`src/main/artifacts/`、`resources/plugins/` | 保留扩展机制；国内资产库应另有签名、权限、版本和撤销，不复用匿名链接分享 |
| Cloud | `cloud/apps/` 的账户、relay、push 等 | 它们是另一部署系统。私有桌面不应默认为已拥有完整可私有部署的上游云服务 |
| Mobile/Web | `mobile/`、`vite.web.config.ts`、renderer 的 web-preload | 第一版不把手机作为必须功能；每种客户端都必须验证相同策略 |
| Native | `native/`、node-pty、sherpa-onnx 等 | 有平台和架构绑定。macOS 实测不等于国产 OS／ARM／龙芯验收 |

## 哪些证据改变了实现判断

### 1. 中文化已有机制，缺的是覆盖与产品语义

主进程 `src/main/i18n/main-i18n.ts` 与渲染进程 `src/renderer/src/i18n/i18n.ts` 都已使用 i18next、按需语言加载及插件语言包。基线英文 14,310 个键、中文 12,155 个键，缺 2,155 个英文对应键，另有 614 个值相同的候选项。相同值可能是 ID、品牌或技术名，不能直接判为漏译。

因此继续使用现有体系：首先覆盖首次启动 → 项目 → 创建任务 → 终端／文件 → 差异审阅 → 设置。随后处理错误、空状态、通知、原生菜单、快捷键提示。中文输入法还要在终端组合输入、选择复制和中日韩宽字符场景实测，不能靠翻译文件验收。

品牌映射在目录和 fallback 文案进入 i18next 时完成，发生在用户变量插值之前；避免把用户叫作 Orca 的项目改名。内部事件名、存储字段、包名、CLI 参数仍按兼容合同逐项迁移。正式法律声明保留原始来源。

### 2. 三类模型路径要分别覆盖

- 交互 TUI：`tui-agent-config.ts` 已有 Kimi、Qwen Code、MiMo、OpenCode、TRAE CN 的启动定义。存在定义只证明启动适配有代码，不证明本机安装、认证、模型能力或内网可用。
- 非交互生成：`src/main/text-generation/` 和 `src/shared/commit-message-agent-specs-{primary,secondary}.ts` 独立规划提交说明、分支名、PR 文案等命令；不能假设 TUI 成功后这些也成功。OpenCode 的静态默认模型甚至包含上游托管的免费模型，需要显式指定企业 provider/model。
- 结构化对话与辅助功能：Claude SDK、Codex app-server、语音识别和用量查询有各自协议。`speech/openai-transcription-client.ts` 存在固定 OpenAI 地址；MiniMax 默认地域原为 overseas。国内模型名称不代表国内路由。

收到用户补充后，首批可验路径调整为固定版本 CodeBuddy／Qoder CN／TRAE CN → 国内认证 → 项目读写与工具调用 → 非交互生成 → 结构化事件适配；国内 API 合同探针独立保留，OpenCode／Qwen Code 继续作为兼容候选。首轮未安装这些新执行器；用户已决定凭据稍后配置，当前只做启动与配置合同验证。

### 3. 配对令牌不是企业用户与数据权限

`runtime-rpc-request-admission.ts` 用共享本地 token 验证 socket 请求，并作长轮询容量控制。`device-registry.ts` 给配对设备独立可撤销 token；WebSocket dispatch 有 mobile/runtime 范围与方法限制。这些控制有价值，但没有实现客户部门、项目、数据行列、规则版本或操作目的的授权。

企业网关必须把 actor、tenant、project、run、policy version 带入受控调用。服务端按数据对象和动作重新鉴权；不能只由一个“已登录”的前端拿通用 runtime token。

### 4. 工作树隔离、进程恢复和审计是不同层

Git worktree 隔离修改目录，不限制终端读取其他目录、访问网络或继承凭据。SSH 场景执行主机拥有进程事实，客户端断线应标为“无法确认”，不能推断执行已结束。适配层必须保留启动未知、停止未知、失败、完成等状态，并按 epoch/attempt 去重。

编排库已有幂等 receipt、调用者 fingerprint、payload hash 和 observation sequence；可以引用它们构造证据，但同一主机管理员仍可能改写本地库。需要外送到独立权限的审计存储、序号缺口检测、时间校验和签名批次，才有不同强度的证据。

### 5. 诊断日志不是法定审计保留

`observability/local-file-sink.ts` 默认按约 10 MB × 10 文件轮转，是容量策略，不是依法保存期限策略。DNT／关闭遥测与本地日志关闭分离：保留必要诊断，同时不默认外送。审计事件应单独设保留、访问、删除与诉讼／调查保全。

## 外部入口清单和处置

| 入口 | 基线与代码 | 本轮处置／下一步 |
| --- | --- | --- |
| 账户/relay | `orca-profiles/profile-cloud-auth-config.ts`；login / relay.onorca.dev | 私有策略下不返回云配置；企业 OIDC 和私网连接另接 |
| 分享 | `artifacts/artifact-cloud-config.ts`；share.onorca.dev，原实现限制上游域名 | 私有策略阻止；以后接客户资产服务，不仅替换 URL |
| 推送 | `startup/main-process-push-startup.ts`、`runtime/push/push-gateway-origin.ts` | 原来未登录也能初始化推送；本轮双层阻止 |
| 遥测 | `telemetry/consent.ts`、构建时常量 | 私有策略高于用户 opt-in；品牌构建不注入上游遥测身份及 key |
| 支持诊断上传 | `observability/diagnostic-upload-endpoint.ts` | 返回无端点；本地日志仍独立管理 |
| 更新 | `updater/`；GitHub release、nudge、固定版本选择、下载和安装 | 自动和手动路径阻止；下一步内部签名更新源和回退 |
| 插件市场/撤销表 | `plugins/plugin-git-repository.ts`、`plugin-kill-list-service.ts` | 阻止网络拉取；缓存撤销记录仍读取；内部签名撤销源待实现 |
| Git托管/任务平台 | GitHub、Linear、Jira、Gitea等 adapter | 不盲换协议；优先实测自建 Gitea/GitLab，再评估 Gitee／飞书接口 |
| Agent下载、MCP、浏览器、语音、模型列表和API | 分布在执行器、终端、插件和 speech 等路径 | 尚未统一阻断；发布前逐条替换和网络层限制 |

首批静态报告提取到 100 个域名线索；新增国内 CLI 官方文档后为 102 个，包含文档链接、示例、用户点击入口和请求地址；数量不代表真实出站次数，也不包含全部动态拼接地址。复跑 `pnpm audit:forflow`，检查 `.forflow/evidence/source-inventory.json` 的具体文件。

## 供应链与打包结论

主仓库 MIT；根 LICENSE 为 `Copyright (c) 2026 Lovecast Inc.`。本轮原文保留并增加来源 NOTICE。当前直接依赖盘点 32 项，不含完整传递依赖及二进制。`ssh2` 未在 package.json 声明 license 字段，需读其 LICENSE；其他平台可选 native 包在本机未安装，不能据此判断其合规性。

打包文件包含原品牌的 appId、协议、CLI、macOS 权限描述与 helper app、Windows NSIS hooks/签名、Linux 包名/安装脚本/desktop WM_CLASS。简单覆盖 productName 会留下原品牌注册与潜在冲突，因此本轮仅交付可运行开发构建。后续每个平台需完整品牌化和并存／卸载／升级测试，不关闭签名验证来绕过安装问题。

## 本轮追加的国内 CLI 适配

根据用户后续指定的生态，新增 CodeBuddy 与 Qoder CN 的启动适配，复用既有 TUI 链路。发现 WorkBuddy/QoderWork 桌面名不能直接作为 CLI 命令；Qoder CN 的位置参数是一次性执行，必须用交互参数启动；火山 arkcli 属于模型与云工具链。具体证据、改动与验证层级见 [国内 CLI 接入](domestic-cli.md)。
