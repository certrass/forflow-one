# 1.4.224-forflow.1 候选记录

2026-10-13：macOS arm64 候选已打包，隐藏 Electron 的 12 个成品场景通过。最终 CLI／Web 类型复验通过，Node 类型复验仍在运行。私有[草稿 PR #6](https://github.com/certrass/forflow-one/pull/6) 承接 #5，未合并；本轮没有替换日常安装版或正式发布。

## 来源与制品

| 对象 | 版本或指纹 |
| --- | --- |
| 官方稳定版 | [Orca v1.4.224](https://github.com/stablyai/orca/releases/tag/v1.4.224)，2026-10-10 发布 |
| 上游提交 | `2bb20586ebc39d605e16d95f57420e20a16e7485` |
| 私有起点 | `codex/upstream-v1.4.222` / `01aa1dc90bfbb03fc32c6017f2d2ea39836ed115` |
| 三方合并 | `3dff9295e240c274858464768a80ae0063b88887`，保留两个父提交 |
| 最终运行代码 | `ab873f04372fab2d896228086ecca88f263d19ca` |
| 候选 ASAR SHA-256 | `bf9e651e849d5ba7531b21901cd3f4c9755fb164a547182db5deecef1665e5af` |
| ZIP SHA-256 | `086044a952a76bd3bc64790eb7407c3c9845b738dc5211e3931d1c4dc7aded98` |
| 当前日常安装版 | `/Applications/Forflow One.app`，`1.4.222-forflow.1`，本轮未替换 |

工程位于 `/Users/zezhou/.codex/worktrees/orca-1-4-224-cn-update/Forflow One`，分支 `codex/upstream-v1.4.224`。Git 对象放在独立本机缓存，避免同步目录中对象脱水；主工程和其他任务的未提交改动保留。上游 v222 与 v224 发行分支存在分叉，共同祖先为 `761d63a4e52ff7915d4432c004df13182db63010`，本轮使用实际三方合并。

本机候选根目录为 `/Users/zezhou/Library/Caches/Forflow One/builds/1.4.224-forflow.1/final/`：

- `mac-arm64/Forflow One.app`：已完成本地临时签名与 `codesign --verify --deep --strict`。
- `Forflow-One-1.4.224-forflow.1-mac-arm64.zip`：CRC 全部通过，回读包内版本和 ASAR 与候选一致。
- `proof.json`：来源、锁文件指纹、实际执行范围与测试报告位置。

工具链为 Node 24.14.0、根目录 pnpm 11.19.0、Electron 43.7.5、Bun 1.4.2。mobile 子工程使用上游固定的 pnpm 12.8.1。冻结锁文件安装通过；Electron 下载超时后复用同版本本机运行时，没有把这一结果描述为冷缓存安装成功。

## 用户能看到的变化

- 原生结构化聊天接入本版的查找、选中回复引用、子智能体、停止和 CSV 编辑。迁移保留旧聊天默认值；当前会话切换对话／终端不再改变新会话默认值。
- 新版聊天此前绕过终端工具栏，国内审阅和查看产出入口随之遗漏。现在复用同一套工作区操作，带入当前项目与主机，继续使用已有审阅表单、材料选择和版本记录。
- 会话协作继续使用上游的移交、分叉与编排；来源记录和工作目录进入原有未发送草稿。没有另建交接或多版比较流程。
- 豆包和 WorkBuddy 保留标准选择器、同会话回复、多行发送、草稿、Ctrl+C 停止和取消授权。
- Git AI 与聊天可以分别选择智能体。默认伙伴不支持自动生成文字时，设置页提前说明；原有分支名称、提交说明、合并请求详情选择器可独立设置 Codex 等兼容智能体。错误补成中文，源代码管理 AI 的名称统一，没有替用户自动切换供应商或修改聊天偏好。
- 工作区多项关联、对话内可视化、聊天升级提示和管理服务器设置补齐中文。上游自动化模型／推理参数、远端重连与手机可视化源码随稳定版整体纳入；这些平台能力的真实远程运行不在本机成品证明范围。

## 验证

整合主体 `ba4c4a0422225d1cf606c3e99258fba96a40f303` 的登记回归 3,853 项通过，72 项聊天专项、104 项上游功能专项、45 项工作区操作相关测试通过。范围存在重叠，不相加。最后 Git AI 改动的 82 项相关测试通过，13 个变更文件的六类质量扫描与 SAFETY 检查无新增问题；QA 类型检查通过。完整上游适配相对 v224 的 1,001 个变更文件质量检查在主体提交通过。最终 CLI／Web 类型复验通过，Node 最终复验仍在运行。

桌面、网页与 mobile-web 构建通过，构建后的技能／CLI 依赖闭包 747 个文件、7 项命令通过；macOS 原生助手构建和候选签名通过。最终候选的 11 个核心场景及 1 个 Git AI 场景通过，无跳过：

| 链路 | 已验证的行为 |
| --- | --- |
| v222 设置 → v224 | 旧默认值为对话／终端的两个迁移场景，重启回读正确，废弃字段从有效设置移除 |
| 豆包／WorkBuddy → 对话 | 标准选择器、多行发送、回复、草稿；WorkBuddy 停止与拒绝授权 |
| 当前对话 → 协作 | 原有移交草稿、来源与目录、分叉取消保留草稿 |
| 结构化聊天 | 执行主机记录、子智能体、停止、查找、选中引用进入输入框 |
| 任务／对话 → 审阅 | 当前项目、要求、材料选择、窄窗口、返回草稿、版本持久化与重启 |
| 工作区产出 → CSV | 筛选、编辑、保存及真实文件回读 |
| 引导与私有账户 | 中文引导、账户会话撤销与恢复、私有服务路径 |
| Git AI 独立配置 | 默认豆包时中文提示；在三个原有操作选择器设置 Codex；提交说明生成成功，聊天默认仍为豆包 |

界面使用隔离 HOME／配置和模拟 CLI，窗口始终隐藏，通过 CDP 截图。引用场景的点击使用 DOM 事件，未验证用户桌面上的原生焦点行为。Git AI 生成使用模拟非交互 CLI，不是额外真实模型调用。

另通过实际 WorkBuddy 账户客户端与连接模块读取已登录状态，并经厂商内置 CodeBuddy CLI／ACP 发送真实无工具任务，约 11.8 秒收到匹配回复。禁用工具和 MCP，只保存成功状态与耗时。Aily 本轮未发送飞书消息；真实 Claude 2 项离线测试通过，11 项在线场景被环境门控跳过。积分 API 未新增接通。

## 失败与复验

首轮成品验证发现结构化聊天缺少国内工具栏，修复为共享组件后通过。迁移测试最初误把旧 JSON 归档作为有效设置，改为调用设置 API 并重启回读；协作夹具改为标准选择器显式启动智能体，新移交会话按用户终端默认值再切换视图。Git UI 首轮使用不存在的简写导航名称，改为实际「Git 和源代码控制」后通过；没有改变产品流程或延长超时。

提交钩子的大批并发检查曾被 SIGKILL，改为串行运行同一组检查；文件长度问题通过拆分具体职责解决，未禁用 max-lines。最终 Node 类型复验的默认并发检查占用过高，保留诊断并用同一编译器、相同项目和规则的串行模式复验，没有降低类型检查范围。

## 截图与接续

成品证据根目录为 `/Users/zezhou/Library/Caches/Forflow One/evidence/1.4.224-forflow.1/`：

- `final/structured-chat-child.png`、`final/structured-chat-find.png`、`final/structured-chat-quote.png`：新版聊天。
- `final/workbuddy-native-chat.png`：国内伙伴标准对话入口。
- `final/collaboration-context-draft.png`：复用原有移交。
- `final/feature-review-materials.png`：审阅的材料选择。
- `final/upstream-csv-edited.png`：真实文件编辑回读。
- `source-ai-retest/git-ai-default-explanation.png`、`source-ai-retest/git-ai-separate-agent.png`：默认伙伴说明与 Git 独立选择。
- `final/packaged-tests.json`、`source-ai-retest/packaged-tests.json`：12 个实际场景报告，均绑定上述最终 ASAR。

旧失败和中间复验仍在 `candidate-first`、`accepted`、`flow-retest`、`handoff-retest`、`source-ai-final`，不冒充最终包结果。工程原始日志位于 `.forflow/evidence/upstream-1.4.224/`。

真实 SSH、Linux、Windows 与手机真机未验证。本地候选没有 `orcad-template`，继续保留旧 SSH Node 路径；子智能体完整产出自动汇入 Review 仍是已有来源接线缺口，现有材料选择继续可用。下一步完成最后 Node 类型复验并更新私有草稿回执；合并、正式发布及日常安装替换按用户对应指令执行。
