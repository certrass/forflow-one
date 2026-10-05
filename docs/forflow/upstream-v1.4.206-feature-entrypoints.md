# Orca v1.4.206：Forflow 功能入口清单

核对日期：2026-09-21。对象为独立集成分支 `codex/upstream-v1.4.206`，上游提交 `c62eca3988ce4d7fce12fbfd20c0c47b39e9ecac`。用户先选择“先整理所有新功能入口”，随后要求“继续修正”。初次盘点只整理入口；后续已修复默认 Shell 编辑和设置搜索可发现性，并接入本机 Codex 正文搜索 → Review，未开启真实索引或安装应用。

**基础入口已在 1.4.206-forflow.1 候选中，后续 Shell／设置搜索修复及正文搜索 → Review 目前仅在源码中，尚未重新打包。不能按本清单推定当前安装版已具备。** 入口、条件和默认值来自源码核对；候选包尚未完成窗口交互验收。已有构建和回归证据见 [集成试验记录](upstream-v1.4.206-trial.md)。

发行范围以 [官方 v1.4.206 发布记录](https://github.com/stablyai/orca/releases/tag/v1.4.206) 为准，下表覆盖用户可见的新功能、设置及自动生效的主要增强。后续 main 上的新增功能不算本候选的新增能力。

## 1. 会话搜索与索引

| 功能 | 从哪里进入／怎么触发 | 开启条件及当前接线 |
| --- | --- | --- |
| 历史会话全文搜索 | 右侧“会话历史”面板 → 搜索框；也可从设置的“智能体会话搜索” → “在侧栏打开”进入 | 索引默认关闭。未开启时仍是原来的标题筛选；输入查询后可看到启用提示。启用后显示匹配正文和来源状态 |
| 本机索引管理 | 设置 → 智能体会话搜索 → 本机条目 | 显示开启状态和索引进度；主动开启后才读会话构建索引。搜索索引与“Codex 使用情况读取”是不同开关 |
| 跨电脑搜索 | 会话历史顶部电脑范围选择 → 某台电脑／全部电脑 | 对已配对且支持搜索的主机查询。逐台报告关闭、未就绪、不可达等情况；不能将没有搜到等同于不存在 |
| 远端索引开关 | 设置 → 智能体会话搜索 → 已连接电脑列表 | 可按主机启用，支持的可开启主机也有批量入口。索引保留在执行主机，已认证配对客户端可以取得搜索结果 |
| 清除本机搜索数据 | 同一设置页 → 高级 → 清除搜索数据 | 会先关闭搜索，再删除本机索引副本；不删除原始会话。属于清除操作，不作为普通试用步骤执行 |
| 命令行搜索 | 候选 CLI：`forflow search "关键词"`；状态：`forflow search --index-status` | 每次搜索一台主机，可指定 `--environment` 或 `--pairing-code`；CLI **没有全部电脑聚合搜索**。`--scope conversation` 只查用户／助手，默认 `all` 还查命令和工具输出 |
| 本机 Codex 搜索 → Review | 统计和使用情况 → 使用分析／审阅会话列表 → 搜索会话正文 → 打开审阅 | 源码新增。只查本机 Codex 的全部已索引历史，不改变图表筛选；复用索引启用提示。打开前重读日志并核对命中文件；远端、缺失、无法确认的来源不可打开 |

搜索的工具输出按每条最多 3,072 字符入索引，用户／助手正文全量入索引；索引不自动脱敏。远端查询不会返回本机文件路径和可直接执行的恢复命令。

来源：[面板接线](../../src/renderer/src/components/right-sidebar/AiVaultPanel.tsx)、[搜索开关与侧栏入口](../../src/renderer/src/components/settings/SessionHistorySettingsPane.tsx)、[清除行为](../../src/renderer/src/components/settings/SessionSearchAdvancedSection.tsx)、[默认关闭](../../src/shared/ai-vault-search-settings.ts)、[索引范围合同](../../src/shared/ai-vault-search-types.ts)。候选 CLI 的实测帮助保存在 `.forflow/evidence/upstream-1.4.206/packaged-search-help.txt`。

## 2. 智能体与聊天

| 功能 | 从哪里进入／怎么触发 | 开启条件及当前接线 |
| --- | --- | --- |
| OpenCode 2 Beta | 设置 → 智能体 → OpenCode 2；新建工作区／任务的智能体选择器 | 已加入智能体目录、启动和历史解析。执行主机需能检测到对应 CLI 并完成其认证；不会因应用升级自动安装或登录 |
| OMP 模型发现与切换 | OMP 原生聊天中的模型选择控件；移动端对应 OMP 聊天 | 需要 OMP 运行时和模型发现／切换能力。已纳入代码，未作真实提供商联调 |
| OMP 生成源代码管理文本 | 设置 → Git 与源代码管理 → Source Control AI，选择 OMP；随后从提交／审查文本生成入口使用 | 复用原有 AI 生成入口，需要已安装并可运行的 OMP；不是 Analytics 的会话审计 |
| 计划专用展示 | 支持的原生聊天收到计划提议时自动出现 | 计划以计划内容和相应操作展示；无需另建页面。提供商需产生对应结构化内容 |
| 等待用户输入 | 原生聊天收到提问时自动出现 | 使用等待输入展示，不再只显示原始工具调用行 |
| 重启后重连聊天 | 应用启动后，存在重启前仍在工作的可恢复原生聊天时出现选择弹窗 | 依赖结构化原生聊天已开启。自动重连设置在“设置 → 实验性功能 → 聊天 UI”；`nativeChatResumeWorkOnRestart` 只有显式为 true 才自动走对应流程 |
| 隐藏聊天窗格仍投递排队消息 | 已有原生聊天排队消息，在切走该窗格后触发 | 运行机制改进，无新按钮；保留 Forflow 的聊天正文和上下文预览 |
| OMP 图片附件及会话归属修复 | 原有附件／文件提及入口与 OMP 会话 | 图片通过文件提及传递；子会话状态不再误报到父窗格；无额外功能开关 |

原生聊天重连由应用根界面挂载，不需要在每个聊天页重复补一个恢复按钮。恢复提供了用户选择与状态回报；本清单不将“重连”和“继续执行工作”混为一个动作。

来源：[智能体目录](../../src/renderer/src/lib/agent-catalog.tsx)、[OMP 文本生成适配](../../src/shared/commit-message-agent-spec.ts)、[计划展示](../../src/renderer/src/components/native-chat/NativeChatApprovalCard.tsx)、[重连弹窗](../../src/renderer/src/components/NativeChatResumeOnRestartModal.tsx)、[实验功能开关](../../src/renderer/src/components/settings/NativeChatExperimentalSetting.tsx)、[应用挂载](../../src/renderer/src/app-shell/AppRootSurfaces.tsx)。

## 3. 工作区、差异与项目设置

| 功能 | 从哪里进入／怎么触发 | 开启条件及当前接线 |
| --- | --- | --- |
| 新工作区选择基准引用 | 新建工作区 → 选择 Git 项目 → “创建来源”一行的基准引用选择器 | 仅适用于 Git 且启用分支的工作区；从已有分支或 PR／MR 创建时采用来源自身的基准，不显示额外覆盖控件；文件夹工作区不出现 |
| 紧凑分支选择器 | 同一新建工作区面板 → 创建来源／分支选择 | 沿用原创建流程，改变选择体验，无全局开关 |
| 折叠未修改区域 | 设置 → 通用 → 编辑器 → 折叠未修改区域 | 单文件差异需主动打开；“查看所有更改”的合并差异原本就折叠。只改变展示，不修改文件 |
| 多行差异评论 | 打开文件差异 → 行号旁评论区域拖选，或使用键盘范围选择 → 添加评论 | 评论锚定行范围。此处是代码差异评论，和统计页 Review 的会话日志评论是两个对象 |
| 项目绑定 GitHub 账户 | 设置 → 项目／仓库 → 选定项目 → GitHub 账户 | 按执行主机能力及 `gh` 账户状态展示／启用；只适用于 GitHub，不将此设置泛化到 GitLab 等提供商 |
| 工作区创建与删除修复 | 原有创建／删除流程 | Git 创建优先，后台准备延后；WSL 删除和远端主目录判断使用执行主机信息。无新入口，也不以真实删除作为试用步骤 |

来源：[创建面板](../../src/renderer/src/components/new-workspace/NewWorkspaceComposerNameSection.tsx)、[基准引用显示条件](../../src/renderer/src/components/new-workspace/base-ref-picker-visibility.ts)、[折叠开关](../../src/renderer/src/components/settings/CollapseUnchangedRegionsSetting.tsx)、[多行评论](../../src/renderer/src/components/diff-comments/useDiffCommentDecorator.tsx)、[项目账户绑定](../../src/renderer/src/components/settings/RepositoryGitHubAccountSection.tsx)。

## 4. 终端、浏览器与日常操作

| 功能 | 从哪里进入／怎么触发 | 开启条件及当前接线 |
| --- | --- | --- |
| 默认终端 Shell | 设置 → 终端 → 默认终端 Shell | macOS／Linux 可选择系统或自定义可执行文件；影响新建本机终端。Windows 使用同页的 Windows Shell 选择。首次切换及清空后编辑问题已在源码修复，尚未重新打包 |
| 搜索匹配计数 | 聚焦终端 → macOS 按 Cmd+F，其他系统使用相应查找快捷键 | 搜索框显示当前匹配／总匹配数量；重复查找可重新聚焦。无开关 |
| URL 左键／中键行为 | **设置 → 浏览器 → 终端 URL 点击** | 可选择显示操作菜单、直接打开或交给终端；作用于识别出的 URL。此入口不在“终端”设置分类下 |
| 终端内联图片 | 设置 → 终端 → 渲染 → 内联图片 | 默认开启；由终端程序输出支持的图片协议后展示，不是把任意图片路径自动变成预览 |
| 关闭运行中终端前确认 | 设置 → 通用 → 导航 → 关闭运行中终端前确认 | 默认确认；作用于停止正在运行的智能体或命令，保护仍在执行的终端 |
| PDF 中文、日文、韩文修复 | 从现有文件／文档预览入口打开 PDF | 使用已合入的 pdf.js 资源，不需新入口；候选已构建资源，尚未做本轮整包视觉检查 |
| Markdown 滚动、bash 高亮、长路径展示 | 原有 Markdown／编辑器入口 | 自动生效的展示修复 |
| 浏览器缩放下的视口预设、截图标注 | 内置浏览器 → 原有视口预设、截图标注操作 | 自动生效的兼容修复；浏览器身份统一为进程级选择，不再以单个文档页独立身份覆盖 |

来源：[终端设置](../../src/renderer/src/components/settings/TerminalPane.tsx)、[终端查找](../../src/renderer/src/components/TerminalSearch.tsx)、[URL 点击设置](../../src/renderer/src/components/settings/BrowserTerminalLinkActionsSetting.tsx)、[内联图片设置](../../src/renderer/src/components/settings/TerminalRenderingSection.tsx)、[默认值](../../src/shared/default-global-settings.ts)、[关闭确认](../../src/renderer/src/components/settings/GeneralPane.tsx)。

## 5. 统计性能、移动端及底层能力

| 功能 | 用户入口 | 真实状态 |
| --- | --- | --- |
| Claude／Codex／OpenCode 用量扫描工作线程 | 原有“统计和使用情况”及刷新操作 | 自动采用后台 worker，目的在于降低主进程阻塞；不新增统计页或计量口径 |
| Codex 日志增量读取 | 同上 | 从已解析字节位置继续读取；不是新增完整事件审计链 |
| 自动化历史大列表虚拟化 | 原有自动化运行历史 | 自动生效，无新开关；保留 Forflow 现有自动化入口 |
| 手机任务、文件、会话历史的网页界面 | **移动端开发构建** → Troubleshoot → Hybrid shell (dev) | 桌面已提供网页 bundle，但手机正式构建的 `loadMobileWebShellEnabled()` 强制返回 false。不能列为普通发布版可开启的入口 |
| 移动端不可达提示、返回操作、通知说明 | 原有手机连接／页面／通知流程 | 相应客户端版本才具备；当前只构建了桌面及 mobile-web，未安装或实测手机客户端 |
| 统一 `agent.launch` 执行器 | 运行时 API，由既有启动入口调用 | 底层能力，不为用户另加一个“启动执行器”页面；远端能力及版本需按运行时合同处理 |

来源：[统计 worker](../../src/main/usage/usage-scan-worker-client.ts)、[Codex 使用情况](../../src/main/codex-usage/store.ts)、[桌面移动资源服务](../../src/main/runtime/bundled-mobile-web-bundle.ts)、[移动端正式版本关闭条件](../../mobile/src/storage/preferences.ts)、[开发入口](../../mobile/src/diagnostics/mobile-web-shell-dev-row.tsx)。

## 6. 修复状态与仍待补的接线

1. **本机 Codex 全文搜索 → Review 已接通。** 新入口复用上游查询、索引开关、匹配片段和分页；原统计搜索仍用于标题／ID／项目／模型，原图表和筛选不变。搜索审阅采用本机全部日志／全部历史范围，后端校验实际读取的来源包含命中文件，再写入已有版本账本。远端和无法读取来源的按钮禁用；关闭弹窗、切换查询或离开页签后，迟到的响应不会打开 Review。搜索摘要不保存为审阅证据；精确跳到命中原文、审阅读取窗口扩大与跨主机审阅仍未实现。
2. **默认 Shell 已修复并通过 DOM 回归。** 原实现以配置是否非空判断 custom，导致初次切换无法打开输入框、清空输入后又退出编辑。现在将编辑模式独立于已保存路径；选择自定义本身不改写配置，留空仍使用系统 Shell。已补齐中文文案、路径检查异常处理，并忽略切换／编辑后的过期检查结果。Windows 保留原有入口。
3. **移动网页界面仍是开发入口。** 不修改上游开发开关来冒充正式交付；后续需要明确手机客户端版本、开启策略与成品验收。
4. **设置搜索缺口已修复。** 默认终端 Shell 原本漏接全局设置索引，现已按主机平台注册；中文“左键／中键”“重连／重启”和对应英文均可命中既有设置。URL 点击仍归浏览器、重连仍归实验功能，没有新建设置页或更改原生聊天／移动端启用条件。

未完成范围仍按上文保留。源码依据：[统计搜索字段](../../src/main/codex-usage/codex-session-analytics.ts)、[审阅读取本机日志](../../src/main/codex-usage/store.ts)、[检索证据合同](../../src/shared/ai-vault-search-contract.ts)、[Shell 编辑与校验](../../src/renderer/src/components/settings/TerminalDefaultShellSection.tsx)。

## 7. 后续试用顺序

先检查不依赖外部账户的终端查找、差异折叠、多行评论和新工作区基准引用；再用明确的测试会话验证索引开关、命中来源及 CLI；之后测试原生聊天重连。OpenCode 2／OMP、跨电脑和手机端按各自环境单独验收。

整包窗口检查仍受项目指定 Electron skill 缺失影响。本清单是源码入口核对，不是实际点击通过记录；原候选 64 项增量质量诊断与其他发布条件沿用集成试验记录，不因补写本文而消失。

## 8. 后续修复验证（2026-09-21）

- 6 文件／79 项针对性测试通过，含 8 项 Shell 交互与异步校验、2 项平台／中英文入口检索回归及相邻已有测试。已登记到 Forflow 回归清单。
- Web 类型检查通过；本次 8 个改动 TS/TSX 文件的基础、类型断言、专项插件、类型感知、React Doctor、设计系统六类扫描均通过。这不是全量上游合并门禁重新通过。
- 中英文目录各 15,723 键，中文无缺键；目录引用与 2,056 项运行时英文目录校验通过。
- 证据位于 `.forflow/evidence/upstream-1.4.206/entrypoint-fixes-*`，独立于原候选 proof。原候选包未更新，仍需后续构建及隐藏窗口交互验收。

## 9. 正文搜索 → Review 接入验证（2026-09-21）

新增 `CodexTranscriptSearch`，通过现有 `CodexAnalyticsPanel` 进入 `StatsPane` 的 Review；输入框、弹窗和状态提示沿用现有组件。新增请求字段 `expectedSourcePath` 仅用于核对来源，不接受它作为任意文件读取入口，不改变既有审阅 ID 或账本格式；普通 Analytics 打开和历史重读仍兼容。

5 文件／53 项专项通过，包括新入口 13 个交互用例、真实合成日志的来源匹配／不匹配和原有索引、版本化审阅测试。初次测试 mock 缺少 i18n 导出，以及测试括号和滚动条样式诊断已修复，首轮输出保留。验证证据以 `search-review-` 为前缀；本轮没有启用真实历史索引、发送外部模型请求、构建候选或安装。

主进程与 Web 类型检查通过，本次 10 个 TS/TSX 文件的六类质量扫描均通过；中英文目录各 15,729 键，中文无缺键，运行时英文仍为 2,056 项。原合并的 64 项质量诊断未在本次重跑整体验收，仍不能据此宣称完整合并已达到发布条件。
