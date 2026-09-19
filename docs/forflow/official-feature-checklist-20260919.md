# Orca 官方功能逐项验收清单（Forflow One 对照）

日期：2026-09-19。对象：`1.4.205-forflow.8`、macOS arm64、`cn-private`。本文件只完成文档清点和验收设计，**下表所有项目均待本轮实际验证**；不会因页面存在、源码存在或旧版测试通过而自动打勾。实际执行者应另附版本／app.asar 指纹、测试配置、结果与证据。

## 来源、范围与使用方式

- 已联网打开 [官网导航](https://www.onorca.dev/docs)、[运行方式](https://www.onorca.dev/docs/ways-to-run)、[设置](https://www.onorca.dev/docs/settings)、[CLI reference](https://www.onorca.dev/docs/cli/reference)、[技能](https://www.onorca.dev/docs/cli/skills)。官网导航与本机 `docs/site/content/docs/**/*.mdx` 对应 **57 个正文页面**。Cloud VM 是运行方式页的章节，不另算一个页面。
- 细项依据本仓库上述 MDX 正文提炼。没有声称已逐页联网验证57页正文完全一致。普通 HTTP 请求官网被403拒绝，已使用可用浏览工具读取入口；没有绕过访问限制。表内链接为官网文档路由，末尾提供57页覆盖索引。
- Forflow 差异依据当前 [操作手册](user-manual.md)、[管理员手册](admin-manual.md)、[.8发布说明](release-1.4.205-forflow.8.md)、[当前项目上下文](CONTEXT.md)。[数据治理设计](data-and-evidence.md) 明确为设计输入，不能算已实现。
- 表中步骤是**测试设计，不是授权新外部动作**。本地操作使用一次性测试仓库、合成文件和隔离配置；实际账号、系统授权、向他人发送、上传、发布、付费和破坏性动作按已有用户授权执行。缺少条件记“受阻／待条件”，不能改成通过或静默跳过。
- 副作用标记：`本`=隔离本机读写或进程；`网`=外部请求／消耗API配额；`模`=真实模型调用和可能费用；`外写`=远端资源、消息或发布；`权`=系统授权、账号指针或设备授权变化；`删`=清理或破坏性动作。可组合。
- 结果建议：`通过`、`失败`、`待条件`、`私有版预期阻断`、`未实现`、`未覆盖平台`。模拟、单元、隐藏渲染、可见点击、真实服务端结果分列，不互相替代。

## 当前必须保留的差异

1. 上游“worktree即sandbox”和默认全自动参数不可照搬。Forflow 工作树只隔离工作目录，默认保留执行器权限确认；需检查实际参数和权限提示。上游 Agents & sessions 与 Settings 的 Manual/Yolo 描述也不完全一致。
2. Forflow 使用独立应用、数据与 `forflow` 命令；`orca.yaml`、`.worktreeinclude` 等兼容文件名仍有效。CLI帮助含英文／上游名称是已知缺口。
3. 本机旧 `/usr/local/bin/forflow` 是 root 所有0700链接，普通用户读取失败；`.8` 防止以后管理员安装再次生成这种权限，但不自动修复未知旧链接。错误恢复验收与“全局CLI实际可运行”必须分别记录。
4. 私有版的上游更新、公共产物分享、公共技能分享、遥测等不能按官网成功联网流程验收；应验证对应策略阻断并无外发。随包技能安装与公共 `npx` 安装不是同一流程。
5. 国内接入导航、CLI启动、认证调用、历史读取、恢复对话是五层。CodeBuddy／Qoder CN 有启动适配，不等于有历史读取器；WorkBuddy／QoderWork 桌面会话不会自动导入。
6. 企业身份、OS权限、模型认证、Git认证各自独立；企业成员角色尚未实现工作区／数据授权。Forflow自带电脑控制与Codex Computer Use不得混记。
7. 官网 telemetry 的“无账号系统”与技能／产物页的账号要求冲突，不能当成本版本数据流承诺。官网 checkpoint 实际是工作区注记和状态，**不是Git快照或回滚**。

## A. 安装、项目、工作区、布局与恢复

| ID／官网                                                                   | 验收对象                 | 前置条件                         | 操作与可核查结果                                                                                              | 副作用   | Forflow 对照／本轮状态                           |
| -------------------------------------------------------------------------- | ------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| A01 [Install](https://www.onorca.dev/docs/install)                         | 包身份与首次启动         | 指定安装包、空隔离配置           | 启动→关于核对版本、中文、独立应用名和数据目录→检查首次引导；保留包指纹                                        | 本       | macOS arm64包；原Orca保留；待实测                |
| A02 [Install](https://www.onorca.dev/docs/install)                         | 更新与其他平台           | 对应OS独立机器                   | 检查更新入口策略；Windows/Linux分别安装、启动、终端与卸载回归                                                 | 本/网/删 | 私有升级由管理员分发；当前Mac证据不覆盖Win/Linux |
| A03 [First session](https://www.onorca.dev/docs/first-session)             | 首个完整流程             | 合成Git仓库                      | 添加仓库→创建工作树→打开终端→改文件→看diff→本地提交；每步核对路径和分支                                       | 本       | 可无模型完成；待实测                             |
| A04 [Worktrees](https://www.onorca.dev/docs/model/worktrees)               | 创建基线选择             | 本地分支、提交、测试远端         | 分别从base、已有分支、SHA、远端分支创建→核对HEAD及文件                                                        | 本/网    | 网络fetch与本地创建分开记录；待实测              |
| A05 [Worktrees](https://www.onorca.dev/docs/model/worktrees)               | 后台创建、取消、失败重试 | 可控慢setup及失败脚本            | 提交后继续其他工作区→看进度→取消→失败Retry；确认无重复工作树或丢失原文件                                      | 本/删    | 待实测                                           |
| A06 [Worktrees](https://www.onorca.dev/docs/model/worktrees)               | 多仓库项目组、普通文件夹 | 两个子Git仓库+非Git目录          | 导入父目录→项目组创建folder workspace→选择任务来源仓库→普通文件夹终端／编辑；无Git功能应合理降级              | 本       | 不把folder workspace当git worktree；待实测       |
| A07 [Worktrees](https://www.onorca.dev/docs/model/worktrees)               | 共享目录与复制           | 合成ignored缓存/配置，无真实密钥 | 分别设Shared Paths、orca.yaml共享目录、.worktreeinclude→建树→验证复制或链接语义；tracked/missing/glob跳过提示 | 本       | 保留兼容文件名；禁止拿真实.env作样本；待实测     |
| A08 [Worktrees](https://www.onorca.dev/docs/model/worktrees)               | 编辑名称、来源和层级     | 多个父子测试工作区               | 双击改名→编辑关联issue→子树休眠／删除预览；跨repo/host、循环和失效血缘不误选                                  | 本/网/删 | 删仅一次性对象；待实测                           |
| A09 [Worktrees](https://www.onorca.dev/docs/model/worktrees)               | 外部worktree发现         | CLI创建一个测试worktree          | 打开隐藏树对话框→Show→切换全局来源与项目override→外部remove后刷新                                             | 本/删    | 使用该测试仓库；待实测                           |
| A10 [Worktrees](https://www.onorca.dev/docs/model/worktrees)               | 资源清理与保留分支       | 有未合并提交的测试分支           | Resource Manager筛选／排序→删除选中测试树→核对未合并分支保留及Review Branches；未选对象不变                   | 本/删    | 清理不是只关闭标签；待实测                       |
| A11 [Tabs/panes](https://www.onorca.dev/docs/model/tabs-panes-splits)      | 标签拖放、嵌套分屏       | 终端、编辑器、浏览器三类tab      | 重排、跨组移动、横竖嵌套split、调整比例→切工作区再返回→核对布局与焦点                                         | 本       | 待实测                                           |
| A12 [Tabs/panes](https://www.onorca.dev/docs/model/tabs-panes-splits)      | 快捷键与批量关闭         | 测试标签若干                     | 切全部类型／同类型／最近tab→关闭全部editor tabs→确认非编辑器保留                                              | 本       | 以平台及用户keymap为准；待实测                   |
| A13 [Session restore](https://www.onorca.dev/docs/model/session-restore)   | 应用退出后暖恢复         | 隔离profile、输出计数的测试进程  | 退出测试app而保留daemon→重开→核对同PID、期间输出、布局、焦点与scrollback                                      | 本       | 不退出用户活动会话；待实测                       |
| A14 [Session restore](https://www.onorca.dev/docs/model/session-restore)   | daemon丢失后的恢复       | 可销毁独立测试daemon             | 结束该daemon→重开→布局/已存输出恢复；旧PID不能显示仍运行，可明确重启                                          | 本/删    | 不重启用户电脑；待实测                           |
| A15 [Quick Open](https://www.onorca.dev/docs/model/quick-open)             | 文件快开与统一+搜索      | 合成tracked/ignored文件、已开tab | Cmd-P片段搜索→ignored第二轮出现→+搜索优先复用已开tab；多词及?搜索路由正确                                     | 本/网    | 网页搜索用无敏感词；待实测                       |
| A16 [Jump Palette](https://www.onorca.dev/docs/model/quick-open)           | 跨树跳转、范围与键盘     | 10个测试树、多个项目/host        | Cmd-J→筛选host/repo→最近项数字键→typed展开See more→Shift-Enter分屏→重开临时筛选恢复侧栏范围                   | 本       | 离线host不伪装可运行；待实测                     |
| A17 [Parallel recipe](https://www.onorca.dev/docs/recipes/parallel-agents) | 三Agent同题比较          | 三个已批准CLI和隔离树            | 同题分别启动→并排看状态→只在各自树改文件→比较结果与diff；无跨树写入                                           | 本/模    | 凭据延期则待条件，普通shell不能算三Agent通过     |
| A18 [Jump recipe](https://www.onorca.dev/docs/recipes/jump-worktrees)      | 10工作区导航端到端       | A16测试数据                      | 在活跃工作区间键盘跳转→检查终端、浏览器、编辑器上下文未串树                                                   | 本       | 可复用A16证据，仍记录此用例对应结果              |

## B. Agent、账号、聊天、历史、用量与记忆

| ID／官网                                                                 | 验收对象                  | 前置条件                           | 操作与可核查结果                                                                              | 副作用   | Forflow 对照／本轮状态                           |
| ------------------------------------------------------------------------ | ------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| B01 [Supported agents](https://www.onorca.dev/docs/agents/supported)     | 目录和实际host检测        | 每个目标CLI的固定版本或缺失fixture | 对下方供应商清单逐一检查检测、启用/禁用、启动命令、cwd、缺失错误；远端不得复用本机检测        | 本/网    | 菜单存在只算发现入口；待实测                     |
| B02 [Agents/sessions](https://www.onorca.dev/docs/model/agents-sessions) | 权限启动默认值            | 空profile+可审计argv               | 创建CLI会话→记录脱敏argv→核对保留确认；修改一个CLI参数再Reset→其他CLI不受影响                 | 本/权/模 | Forflow默认非Yolo；实际请求批准另验              |
| B03 [Agents/sessions](https://www.onorca.dev/docs/model/agents-sessions) | 状态与重启chip            | 真实已捕获CLI输出／hooks           | 依次working、waiting、done、blocked、exit→侧栏/tab/看板一致→重启同cwd；plain shell不冒充Agent | 本/模    | transcript fixture与实CLI分别记；待实测          |
| B04 [Agent dashboard](https://www.onorca.dev/docs/model/agents-sessions) | 看板、搜索、过滤、子代理  | 状态fixture及远端host              | 开实验开关→NeedsYou/Working/Done/Idle筛选→popout同步→host badge→展开子项定位父terminal        | 本       | 原生可见popout单独环境验证；待实测               |
| B05 [Claude](https://www.onorca.dev/docs/agents/claude-code)             | Claude启动、hook、团队    | 经授权Claude测试账号               | 启动最小任务→核对cwd/status/用量→单独验证后台子代理和Teams子行                                | 本/模    | Teams额外多调用；当前待条件                      |
| B06 [Codex](https://www.onorca.dev/docs/agents/codex)                    | Codex、账户home与重启     | 两个测试身份/隔离home              | System default与托管账户分别启动→核对home隔离→退出Restart保留正确账户→子代理行定位            | 本/权/模 | 不读真实auth内容；待条件                         |
| B07 [Codex](https://www.onorca.dev/docs/agents/codex)                    | Continue in New Session   | 含合成上下文会话                   | Continue→同/不同CLI新会话收到有界交接→旧会话保留且未当成resume                                | 本/模    | 不把聊天工具“新任务”与应用内续会话混淆；待条件   |
| B08 [Cursor](https://www.onorca.dev/docs/agents/cursor-cli)              | Cursor检测、状态、重启    | 固定Cursor CLI及测试认证           | 启动→正确cwd/实际模型→状态→退出重启                                                           | 本/模    | 官网说模型由CLI配置；以本版实际参数为准；待条件  |
| B09 [GLM](https://www.onorca.dev/docs/agents/glm-agent)                  | GLM兼容执行器             | 获准endpoint/model，负责人配置凭据 | 通过指定Claude/OpenCode等执行器发最小请求→查模型回执；失败不自动换域                          | 本/网/模 | 导航不等于国内模型已实调；待条件                 |
| B10 [Hot-swap](https://www.onorca.dev/docs/agents/codex-hot-swap)        | Claude/Codex账户切换      | 两测试账户，不展示凭据             | 切换→新进程新身份，旧进程原身份→并发切换保护→重启身份核对                                     | 本/权/模 | 企业身份与供应商身份不同；待条件                 |
| B11 [Hot-swap](https://www.onorca.dev/docs/agents/codex-hot-swap)        | config同步失效恢复        | 隔离合成config                     | 正常同步→源文件缺失/空/不可读→显示告警保留last-good→恢复再启动新配置生效                      | 本       | 禁止改用户真实config；待实测                     |
| B12 [Native Chat](https://www.onorca.dev/docs/agents/native-chat)        | 聊天发送、停止与问题      | 支持CLI的隔离session               | 开Chat→发合成消息→停止→回答Agent问题→确认终端与Chat同一session                                | 本/模    | 不支持CLI要明确提示；待条件                      |
| B13 [Native Chat](https://www.onorca.dev/docs/agents/native-chat)        | 草稿附件、slash、模型选项 | 合成图片/文件及可用CLI             | 草稿断连重连保留→/目录按Agent过滤→模型/effort设置→首次启动前后真实值一致；图片独立发送        | 本/模    | 附件会交执行器；需授权目标；待条件               |
| B14 [History](https://www.onorca.dev/docs/agents/session-history)        | 发现、scope、筛选与排序   | 各受支持CLI脱敏历史fixture         | Workspace/Project/All→按Agent、folder/project分组→清空全部筛选→empty/无消息隐藏/排序          | 本       | CodeBuddy/Qoder CN历史未实现，不做虚假勾选       |
| B15 [History](https://www.onorca.dev/docs/agents/session-history)        | 打开日志和恢复            | 合成session/cwd                    | Copy ID/path/command、Open/Reveal log、Open cwd→Resume实际同历史；Codex原CODEX_HOME保留       | 本/模    | 预览fixture与真正resume分列；待条件              |
| B16 [Hibernation](https://www.onorca.dev/docs/agents/hibernation)        | 自动休眠与恢复            | 可恢复CLI、短测试阈值              | done后台空闲→休眠标记→打开树自动恢复；working/等待输入/新输出/按键/前台不得休眠               | 本/模    | 待条件                                           |
| B17 [Hibernation](https://www.onorca.dev/docs/agents/hibernation)        | 编排/移动/子代理保护      | 活跃Dispatch、子代理及移动fixture  | unsettled Dispatch、仍活子代理或手机驱动时不休眠→真实settled后允许                            | 本/模    | cannot infer complete from provider done；待条件 |
| B18 [Usage](https://www.onorca.dev/docs/agents/usage-tracking)           | 用量窗口及账户归属        | 合成limit状态+获准只读provider     | used/remaining、reset time、80%警告、detailed/compact切换→空值不能显示0→账户切换跟随          | 本/网    | 统计估算费用与真实账单分开；待条件               |
| B19 [Hooks/memory](https://www.onorca.dev/docs/agents/hooks-memory)      | setup hook及说明文件      | 测试repo和无害脚本                 | 创建树执行setup一次→保留CLAUDE.md/AGENTS.md→开关status hook即时变化且不覆盖用户hooks          | 本       | 共享环境与脚本不是安全沙箱；待实测               |
| B20 [Hooks/memory](https://www.onorca.dev/docs/agents/hooks-memory)      | 应用重启后hook重连        | 隔离长寿命session                  | app重启→后续hook路由新endpoint→UI状态更新；不读取真实endpoint/env秘密                         | 本       | 待实测                                           |

B01参数化供应商目录（每个名字分别记录“发现／启动／认证调用／状态／历史恢复”，不能一条总PASS）：Claude Code、Claude Agent Teams、Codex、Grok、GitHub Copilot CLI、OpenCode、Pi、OMP、Prime Agent、Gemini、Antigravity、Ante、Aider、Goose、Amp、Kilocode、Kiro、Charm Crush、Auggie、Autohand、Cline、Codebuff、Command Code、Continue、Cursor CLI、Devin、Droid、Kimi、Mistral Vibe、MiniMax、Qwen Code、Rovo Dev、Hermes、OpenClaw、TRAE。Forflow另查CodeBuddy、Qoder CN，以及豆包/火山方舟导航；官网目录以现场版本复核。没有对应历史reader的项目记不支持，不要求伪造历史。Windows/WSL账户另在对应平台验收。

## C. 终端、浏览器与文件编辑

| ID／官网                                                                 | 验收对象                      | 前置条件                       | 操作与可核查结果                                                                            | 副作用   | Forflow 对照／本轮状态                       |
| ------------------------------------------------------------------------ | ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- |
| C01 [Terminal](https://www.onorca.dev/docs/terminal)                     | PTY、中文与键盘               | 普通测试shell                  | 输出中文/ANSI、输入编辑、resize、Ctrl-C→exit code正确；Shift/Control-Enter及JIS选项独立检查 | 本       | 不启动模型；待实测                           |
| C02 [Terminal](https://www.onorca.dev/docs/terminal)                     | 搜索、拷贝上下文、OSC52       | 无秘密合成输出                 | 搜索大小写/regex上下条→Copy Context有界→OSC52开关分别允许/拒绝剪贴板写入                    | 本/权    | 写剪贴板需保留用户内容或测试环境；待实测     |
| C03 [Terminal](https://www.onorca.dev/docs/terminal)                     | 链接popover与修饰键           | 合成HTTP/OSC8/file/task链接    | 普通点击→打开选项，Copy Link取真实URL→modifier直接开；已有文件复用tab                       | 本/网    | 本地/SSH/旧remote能力不同；待实测            |
| C04 [Terminal](https://www.onorca.dev/docs/terminal)                     | 主题与shell选择               | 合成Ghostty/Warp/YAML配置      | 导入指定测试主题→font/cursor回读；Win分别PowerShell/CMD/WSL及路径映射                       | 本       | Mac不能代验WSL；待实测/未覆盖平台            |
| C05 [Terminal](https://www.onorca.dev/docs/terminal)                     | 浮动工作台                    | 隔离默认目录                   | 快捷键开/聚焦/关→多个shell/browser/markdown tab→切树不丢失→目录设置生效                     | 本       | 不关联repo的全局工作台单独验证；待实测       |
| C06 [Quick Commands](https://www.onorca.dev/docs/terminal)               | 命令创建、作用域和执行        | 无害printf命令                 | 创建Global/Project→复制→新tab执行/当前tab插入→编辑删除；跨host显示Saved on与执行位置        | 本       | Agent Prompt项另需模型授权；待实测           |
| C07 [Browser](https://www.onorca.dev/docs/browser/overview)              | 基本导航和树隔离              | 本地测试HTTP站                 | 地址补全、前后退、刷新/停止/硬刷、find、新tab/恢复关闭→切树返回页面及scroll                 | 本/网    | 待实测                                       |
| C08 [Browser](https://www.onorca.dev/docs/browser/overview)              | popup、工具与视口             | 合成_blank/OAuth样式页面       | 普通新窗继承profile→命名popup合理路由→DevTools→viewport改变innerWidth/media query           | 本       | 不对真实OAuth登录；待实测                    |
| C09 [Browser](https://www.onorca.dev/docs/browser/overview)              | 下载及文件位置                | 测试服务器固定文件             | 下载→进度→取消→完成Open/Reveal→核对字节；remote下载落执行host                               | 本/网    | 后半远端待条件；待实测                       |
| C10 [Browser](https://www.onorca.dev/docs/browser/overview)              | 远端网络与本地渲染            | 两台获准host及回环服务         | This device/Server streamed→新页生效旧页不迁移→HTTP/WS/DNS/loopback归host→fallback提示      | 本/网/权 | Forflow未验全部远程上传组合；待条件          |
| C11 [Profiles](https://www.onorca.dev/docs/browser/profiles)             | partition隔离与UA             | 两合成profile                  | 分别写cookie/localStorage/cache→切换不串→自定UA/viewport和native UA选项回读                 | 本       | 不读取用户浏览器cookie；待实测               |
| C12 [Profiles](https://www.onorca.dev/docs/browser/profiles)             | cookie导入与登录例外          | 合成cookie文件/测试账号        | 导入只替换目标域→其他域保留→Google跳过告警→直接登录与外置FIDO选择/取消另验                  | 本/网/权 | 平台passkey官网明确不支持；真实账号待条件    |
| C13 [Design Mode](https://www.onorca.dev/docs/browser/design-mode)       | 元素取证到Agent               | 本地网页、受控terminal         | 开picker→hover/click→核对DOM片段、computed CSS、截图、可用sourcemap→取消不发送              | 本/模    | 页面结构样式不保证原始源码定位；待实测       |
| C14 [Design recipe](https://www.onorca.dev/docs/recipes/design-mode-fix) | UI问题闭环                    | C13+批准模型                   | 选具体错位元素→发送修改指令→检查源文件与刷新后渲染→二次取证核对                             | 本/模    | 真正修复需产物与渲染证据；待条件             |
| C15 [Monaco](https://www.onorca.dev/docs/editing/monaco)                 | 自动保存和查找编辑            | 合成代码文件                   | 中文编辑→blur/idle读盘→多光标→选中文字播种find→目录搜索→支持语言定义跳转                    | 本       | 查找汉化与保存分开检查；待实测               |
| C16 [Monaco](https://www.onorca.dev/docs/editing/monaco)                 | Changes view、wrap、font      | 有HEAD差异文件                 | 切Changes mode保持光标→返回→Alt-Z与全局wrap同步→editor font与terminal继承/覆盖              | 本       | diff wrap独立；待实测                        |
| C17 [Markdown](https://www.onorca.dev/docs/editing/markdown)             | 富文本/源码无损               | 含frontmatter/table/toggle样本 | slash插入、wiki相对链接、表格键盘和行列增删→切源码→读盘核对可移植结构                       | 本       | 待实测                                       |
| C18 [Markdown](https://www.onorca.dev/docs/editing/markdown)             | 长文fallback、目录及标注      | >300KB与不支持语法样本         | 自动raw→允许时Open anyway→TOC跳转→搜索渲染文字→选区review note；不支持结构不损坏            | 本       | 待实测                                       |
| C19 [Viewers](https://www.onorca.dev/docs/editing/viewers)               | HTML沙箱与资源授权            | 本地HTML+相邻/外部目录合成资源 | 打开旁侧预览→额外目录先询问→拒绝无读取→外链确认→禁下载→reload/path copy                     | 本/网/权 | 远端只在工作树范围；待实测                   |
| C20 [Viewers](https://www.onorca.dev/docs/editing/viewers)               | Mermaid/PDF/图片/CSV/notebook | 每种合成样本                   | Mermaid缩放→PDF选取及会话内位置恢复→图片格式→CSV排序搜索/raw→ipynb改cell保留nbformat        | 本       | notebook执行beta另验，不以预览算执行；待实测 |
| C21 [Explorer](https://www.onorca.dev/docs/editing/file-explorer)        | 文件操作与外部变化            | 一次性目录                     | 新建/改名/移动/删→目录优先自然排序9/99/100→外部写入自动刷新→status与path copy               | 本/删    | 仅删合成文件；待实测                         |
| C22 [Explorer](https://www.onorca.dev/docs/editing/file-explorer)        | 拖入、目录搜索、远端传输      | 合成文件及获准remote           | 拖树复制、拖markdown图片、拖terminal路径→Find in Folder；远端upload/download核对字节        | 本/网/权 | 原生拖放和对话框需可见独立环境；待条件       |

## D. 差异、代码审阅与外部集成

| ID／官网                                                                | 验收对象                        | 前置条件                      | 操作与可核查结果                                                                                        | 副作用     | Forflow 对照／本轮状态                           |
| ----------------------------------------------------------------------- | ------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------ |
| D01 [Diff](https://www.onorca.dev/docs/review/diff-viewer)              | 对比范围与文本diff              | staged/unstaged/untracked样本 | combined对比start/base/branch/commit→双侧行号→文件树resize/重开→wrap→键盘hunk导航                       | 本         | 待实测                                           |
| D02 [Diff](https://www.onorca.dev/docs/review/diff-viewer)              | 图片、HTML和逐行暂存            | 图片两版、可删HTML和文本      | image三模式→HTML侧预览仅存在文件有入口→按line/hunk暂存→git diff --cached核对                            | 本         | git命令只对测试库；待实测                        |
| D03 [Diff](https://www.onorca.dev/docs/review/diff-viewer)              | 三方冲突解决                    | 一次性merge/rebase冲突        | three-way选取/编辑→读盘→继续或Abort→原分支/工作树完整                                                   | 本/删      | 不对用户在途merge操作；待实测                    |
| D04 [Annotate](https://www.onorca.dev/docs/review/annotate-ai-diff)     | 行评论、锚点与批量发送          | 合成diff和测试接收Agent       | 添加/取消/保存→改行后锚点→Send菜单选Agent→有界一次批量→resolve后不重复发送                              | 本/模      | 只保存本地评论不算真正Agent收到；待条件          |
| D05 [Attribution](https://www.onorca.dev/docs/review/attribution)       | AI/人工来源与导出               | 支持写入捕获的测试Agent       | Agent写范围→marker→人工覆盖变更归属→导出metadata→Git提交不含自动元数据                                  | 本/模      | 本地归属不是合规证明；待条件                     |
| D06 [Commit/push](https://www.onorca.dev/docs/review/commit-push)       | 暂存、commit与失败hook          | 本地测试repo                  | staged+消息→提交→hook故意失败显示原因；非ASCII路径正确；amend明确选择                                   | 本         | AI生成消息另归D08；待实测                        |
| D07 [Commit/push](https://www.onorca.dev/docs/review/commit-push)       | push/pull/sync与lease           | 测试bare remote或授权远端     | 初次push设upstream→remote ahead普通push拒绝→明确force-with-lease且stale lease拒绝                       | 本/外写    | 可用本地bare验证机制，真实平台结果另验           |
| D08 [Commit/push](https://www.onorca.dev/docs/review/commit-push)       | AI recipes与失败修复            | 获准CLI+合成失败hook          | 生成commit/PR文案→全局与repo recipe覆盖→Fix with AI仅修复不绕hook/自动发布→空结果明确报错               | 本/模      | 待条件                                           |
| D09 [Hosted reviews](https://www.onorca.dev/docs/review/github)         | 多Git provider读/创建           | 各平台测试repo和授权身份      | GitHub/GitLab/Bitbucket/Azure/Gitea逐个核对sidebar review、browser链接、checks；创建验证base/title/body | 网/外写    | 各适配能力不同；Bitbucket无draft；不能只测GitHub |
| D10 [Hosted reviews](https://www.onorca.dev/docs/review/github)         | 评论、反应、Actions与子pipeline | 测试PR/MR及失败check          | 读thread顺序→reply指定评论→GitHub反应toggle→GitLab子pipeline日志→失败check交Agent                       | 网/外写/模 | 对他人消息与CI动作需具体授权；待条件             |
| D11 [Hosted reviews](https://www.onorca.dev/docs/review/github)         | merge/queue/stack               | 可销毁测试PR集合              | eligibility控制→enable/disable auto-merge→queue→stack创建/顺序/merge范围确认→服务端回读                 | 网/外写/删 | 高影响独立授权，不把打开composer算通过           |
| D12 [Linear](https://www.onorca.dev/docs/review/linear)                 | issue抽屉、布局和来源           | 测试Linear workspace          | list/board、分页、筛选/排序跨重启→描述详情→新issue草稿关闭再开→选issue创建树                            | 网/外写    | 状态自动同步为独立opt-in；待条件                 |
| D13 [Jira](https://www.onorca.dev/docs/review/jira)                     | Cloud/Server多站点任务          | 测试Jira站点和账号            | 连接→All sites→读详情→允许transition/custom字段→草稿恢复→URL多站点辨别并创建树                          | 网/权/外写 | 不展示token；Cloud/DC分别验；待条件              |
| D14 [Review recipe](https://www.onorca.dev/docs/recipes/review-ai-diff) | 逐行审阅闭环                    | D01/D04+批准Agent             | 看diff→批量反馈→Agent修订→测试→逐条复审后Resolve                                                        | 本/模      | 无模型时只能验评论前半段；待条件                 |
| D15 [GitHub errors](https://www.onorca.dev/docs/github-errors)          | 鉴权、限流、离线恢复            | mock错误/授权只读repo         | 注入401/403/429/offline→显示具体原因/last-known→停止密集重试→恢复后刷新                                 | 本/网      | 不主动耗尽真实配额；probe健康不等于业务请求成功  |

## E. CLI、技能、自动化、编排与电脑控制

| ID／官网                                                                | 验收对象                          | 前置条件                      | 操作与可核查结果                                                                                | 副作用      | Forflow 对照／本轮状态                                  |
| ----------------------------------------------------------------------- | --------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| E01 [CLI overview](https://www.onorca.dev/docs/cli/overview)            | 注册、PATH、版本                  | 隔离可写命令目录+包内launcher | 未注册→注册→新shell查路径/version→旧链接/未知链接/缺launcher/权限错误→刷新可恢复→移除仅自有     | 本/权/删    | 全局旧0700链接未修；包内version通过不等于PATH可用       |
| E02 [CLI reference](https://www.onorca.dev/docs/cli/reference)          | 身份、help、JSON与host选择        | 测试runtime                   | status/--help→核对forflow版本→错误返回code及JSON envelope→active/id/name selector歧义明确拒绝   | 本          | 英文与orca help是已知缺口；待实测                       |
| E03 [CLI reference](https://www.onorca.dev/docs/cli/reference)          | repo/worktree/file/terminal       | 合成repo和terminal            | 按当前help执行list/show/create/read/send/wait→比对UI与文件→仅关闭测试terminal                   | 本/删       | 先读状态再send；不凭官网旧flag执行                      |
| E04 [CLI reference](https://www.onorca.dev/docs/cli/reference)          | browser、account、emulator命令    | 合成网页/独立模拟器           | snapshot/click/fill实回读；account只读status；iOS/Android仅测试设备list、输入与截图             | 本/权       | 不安装或控制个人设备；模拟器待条件                      |
| E05 [Skills](https://www.onorca.dev/docs/cli/skills)                    | 随包guide与发现                   | 只读CLI、隔离skills目录       | list/get/reference/full/json互相一致→发现Claude/Codex/.agents/OMP样本→名称/作用域准确           | 本          | 使用forflow包内guide，不执行公共npx                     |
| E06 [Skills](https://www.onorca.dev/docs/cli/skills)                    | 本机安装、更新、冲突与删除        | 合成旧版/改动版/只读skill     | 预览目标→随包安装→检测freshness→改动保留→重试→受保护来源不可删                                  | 本/删       | Forflow本机随包流程；remote离线分发另验                 |
| E07 [Skills](https://www.onorca.dev/docs/cli/skills)                    | 公共分享与安装管理                | 私有profile+网络记录          | UI/CLI尝试预览发布→应按私有策略拒绝且零上传；不用真正外部skill链接                              | 网/外写     | 预期阻断；不是官网分享成功流程                          |
| E08 [Skills/MCP](https://www.onorca.dev/docs/cli/skills)                | MCP注册与调用                     | 本地无害MCP stub+支持CLI      | 注册测试endpoint→发现工具→调echo→断线/删配置→工具不可继续可用                                   | 本/网/模    | MCP配置存在不代表模型能调用；待条件                     |
| E09 [Automations](https://www.onorca.dev/docs/cli/automations)          | 创建禁用计划与管理                | 隔离scheduler、固定时区       | 创建disabled→inspect→改schedule/zone/prompt→搜索/host/provider/state筛选/排序/键盘→删除测试计划 | 本/删       | 不自动启用；待实测                                      |
| E10 [Automations](https://www.onorca.dev/docs/cli/automations)          | 真运行、precheck与恢复            | 可控clock+批准provider        | precheck失败记skip且不启动→手动run成功/失败→rerun→missed-grace→fresh/reuse session区别          | 本/模       | 无真实模型仅能验调度fixture；待条件                     |
| E11 [Automations](https://www.onorca.dev/docs/cli/automations)          | 多host所有权及离线                | 第二测试runtime/SSH           | Create on决定项目候选→旧server禁用并提示→offline不误报已完成→host恢复回读run                    | 本/网/模    | 不删除用户已有计划；待条件                              |
| E12 [Orchestration](https://www.onorca.dev/docs/cli/orchestration)      | Run/Task/依赖与gate               | 实验开关+独立runtime          | 建Run/tasks/DAG→blocked gate→resolve仅目标task进入ready；legacy run命令无副作用                 | 本          | gate不是企业审批；待实测                                |
| E13 [Orchestration](https://www.onorca.dev/docs/cli/orchestration)      | Dispatch、worker与模型偏好        | 批准CLI/模型和测试树          | worker-start→receipt requested/effective准确→worker_done带双ID→旧dispatch不能结算新尝试         | 本/模       | 保留用户指定模型/effort；待条件                         |
| E14 [Orchestration](https://www.onorca.dev/docs/cli/orchestration)      | mailbox、wait、ACK、问答          | 独立Run测试参与者             | send/check重放→ACK后不重复→peek不消费→超时与stderr heartbeat→group只本Run→ask回答关联           | 本          | 不向真实他人发送；待实测                                |
| E15 [Orchestration](https://www.onorca.dev/docs/cli/orchestration)      | stop/release/retain/retry、跨host | owned测试worker               | settled后release保留可读输出→retain→显式retry→失联unknown不广泛关闭；remote以dispatch定位       | 本/网/删/模 | 不运行runtime-global reset影响在途任务；待条件          |
| E16 [Checkpoints](https://www.onorca.dev/docs/cli/worktree-checkpoints) | 注记与卡片状态                    | 测试工作区已有注记            | 先读→更新comment/status→UI/CLI一致→保留仍有效旧目标/约束                                        | 本          | 注记不是快照，不验不存在的恢复功能；待实测              |
| E17 [Computer use](https://www.onorca.dev/docs/cli/computer-use)        | 能力与权限真实性                  | 独立测试app及OS授权状态       | permissions/capabilities→拒绝授权时明确失败→状态树与截图分别验证；不自行改系统权限              | 本/权       | 当前辅助功能/截屏状态分别回读；Codex CUA不算Forflow能力 |
| E18 [Computer use](https://www.onorca.dev/docs/cli/computer-use)        | 多窗口snapshot-act-snapshot       | 授权的无敏感测试app           | list windows→按新snapshot真实稀疏index点击/输入/scroll→重取状态→stale index不能乱点             | 本/权       | 原生焦点测试独立显示环境；待条件                        |

## F. 远程、SSH、移动与运行位置

| ID／官网                                                               | 验收对象                    | 前置条件                    | 操作与可核查结果                                                                            | 副作用        | Forflow 对照／本轮状态                       |
| ---------------------------------------------------------------------- | --------------------------- | --------------------------- | ------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| F01 [Ways to run](https://www.onorca.dev/docs/ways-to-run)             | 执行位置与资源归属          | Local/SSH/paired测试目标    | 同任务分别创建→终端hostname/cwd与文件位置一致→缺工具在执行host报告                          | 本/网         | 客户端有CLI不代表远端有；待条件              |
| F02 [SSH](https://www.onorca.dev/docs/ssh)                             | 保存、配置导入与host key    | 获准测试SSH，合成ssh config | Add/Edit、Include搜索→Test→host-key首次确认及变化拒绝→保存重连                              | 本/网/权      | 不读取真实私钥；待条件                       |
| F03 [SSH](https://www.onorca.dev/docs/ssh)                             | 远端文件/Git/terminal与断连 | SSH测试repo                 | 建树→编辑→diff→终端→断网→状态unverifiable→重连原进程不重复启动                              | 本/网         | 失联不等于exited；待条件                     |
| F04 [SSH](https://www.onorca.dev/docs/ssh)                             | auth边界与降级              | jump/Kerberos/FIDO实验环境  | 各认证逐项登录→缺native编译工具时文件/Git可用但terminal明确缺失→端口转发隔离                | 本/网/权      | 不因“SSH连上”全项PASS；待条件                |
| F05 [SSH recipe](https://www.onorca.dev/docs/recipes/remote-worktrees) | 远端开发闭环                | F02/F03及可销毁repo         | 设置Run on→远端编辑测试→SFTP下载核对字节→VSCode Remote SSH命令目标正确                      | 本/网         | 非VSCode及paired server限制分别提示；待条件  |
| F06 [Remote servers](https://www.onorca.dev/docs/remote-servers)       | 直连配对与撤销              | 两个可隔离runtime和安全网络 | 生成一次link→配对→新未用link替代旧→已配对grant保留→revoke立即断开                           | 本/网/权      | Forflow直连能力与上游Relay分开；不能公开端口 |
| F07 [Remote servers](https://www.onorca.dev/docs/remote-servers)       | serve、所有权与多客户端     | 测试headless host           | 包内CLI serve→确认advertised地址→双客户端看同树→断开客户端进程继续→server删测试项目双方消失 | 本/网/删      | endpoint/url含token不落证据；待条件          |
| F08 [Cloud VM](https://www.onorca.dev/docs/ways-to-run)                | recipe生命周期              | 本地Docker或获准云预算      | 实验入口→orca.yaml recipe只primary可选→doctor→create/suspend/resume/destroy→回读真实资源    | 本/网/外写/删 | BYO付费云非Orca提供；先本地stub不冒充云通过  |
| F09 [Mobile](https://www.onorca.dev/docs/mobile)                       | 客户端配对、重连与版本      | 测试手机/客户端及独立host   | LAN/私有路径配对→过期token拒绝→Retry/Re-pair→不兼容协议明确阻断→host地址编辑不串grant       | 本/网/权      | 私有版默认隐藏移动入口，公共Relay不直接采用  |
| F10 [Mobile](https://www.onorca.dev/docs/mobile)                       | 工作区、Chat/terminal与附件 | 已配对测试host+批准Agent    | 列全host→文件树→scrollback/copy/paste→Live不自动Return→Chat切换/模型/附件→快速命令          | 本/网/模      | 手机UI不证明执行在手机；待条件               |
| F11 [Mobile](https://www.onorca.dev/docs/mobile)                       | 创建、源控、浏览器与账号    | 测试repo/身份               | 先选host再建树→stage/commit→Web/Mobile viewport→账户用量→pinned/dirty tab不被批量关闭       | 本/网/权      | reset credit是单独付费动作，不默认执行       |
| F12 [Android](https://www.onorca.dev/docs/android-apk)                 | Android安装与升级           | 已批准版本APK+测试设备      | 核对来源/签名→安装启动→协议匹配→升级保留配对→系统阻挡给正确说明                             | 本/网/权      | 上游APK不能当Forflow私有移动包；未覆盖平台   |

## G. 通知、数据、设置、诊断与私有策略

| ID／官网                                                           | 验收对象                 | 前置条件                          | 操作与可核查结果                                                                         | 副作用      | Forflow 对照／本轮状态                                 |
| ------------------------------------------------------------------ | ------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------ |
| G01 [Notifications](https://www.onorca.dev/docs/notifications)     | 通知真实送达与收件箱     | 测试完成事件，已授权系统通知      | 触发→OS通知/声音/chip分别核对→bell跨树定位→已读/未读→分类和自定义声音                    | 本/权       | 清单开关完成不等于OS授权或送达；待实测                 |
| G02 [Agents feed](https://www.onorca.dev/docs/activity)            | 跨树事件流               | 合成Agent状态和树创建             | 完成/blocked/新树事件出现→摘要→thread跳转正确→重连无重复和假完成                         | 本          | 实验开关单独核对；待实测                               |
| G03 [Settings](https://www.onorca.dev/docs/settings)               | 导航、搜索、语言、快捷键 | 隔离profile                       | 逐pane打开→中/英切换→设置搜索含语言别名→改一个shortcut检查冲突/持久化→重开               | 本          | 原生系统菜单可能随OS英文；逐处记录                     |
| G04 [Settings](https://www.onorca.dev/docs/settings)               | 外观、缩放、状态栏和图标 | 测试profile                       | theme/accent/density/font/zoom→深浅色→资源管理器→图标切换与Finder/Dock/about分别核对     | 本          | Forflow品牌图标不沿用上游样式；待实测                  |
| G05 [Settings](https://www.onorca.dev/docs/settings)               | Git/repo/Tasks设置       | 合成repo+测试身份                 | base、签名、Open in、rename recipe、task source、图标/emoji、hook覆盖→重启后回读         | 本/网       | favicon/GitHub头像可外发；合成资源优先                 |
| G06 [Settings](https://www.onorca.dev/docs/settings)               | 语音输入和模型           | 麦克风授权，预置离线模型          | toggle/hold→开始/停止→设备失效fallback→输入识别；云语音另验                              | 本/权/网/模 | 下载模型/云key另需授权；待条件                         |
| G07 [Settings](https://www.onorca.dev/docs/settings)               | 插件系统和marketplace    | 离线无害测试plugin                | 默认不运行→预览能力→启用才运行→更新/回滚/禁用→worker执行host正确                         | 本/网/删    | 不安装陌生插件；私有策略是否限制需现场核对             |
| G08 [Settings](https://www.onorca.dev/docs/settings)               | Keep awake与资源管理器   | 独立测试进程                      | Off/Agent/On→核对OS实际assertion→Agent停止后释放→CPU/memory与进程一致                    | 本/权       | 避免改变用户真实休眠策略；待条件                       |
| G09 [Telemetry](https://www.onorca.dev/docs/telemetry)             | 上游遥测、诊断外发       | 独立profile+网络记录              | 启动/创建/切设置→验证私有版不发送上游telemetry→诊断预览不自动上传                        | 本/网       | 拒绝数据外发需网络或handler证据，不仅开关文案          |
| G10 [Artifacts](https://www.onorca.dev/docs/settings)              | HTML/MD公共发布阻断      | 合成HTML/MD、私有profile          | editor/browser/CLI三个入口发起→明确拒绝→无账号云上传/公共链接生成                        | 网/外写     | Forflow预期阻断；与E07技能分享分别验                   |
| G11 [Troubleshooting](https://www.onorca.dev/docs/troubleshooting) | 故障可恢复与日志         | 缺CLI、坏PATH、无tab、离线fixture | 每种失败分类→可重试或具体补救→无永久spinner/unhandled；日志可打开且脱敏                  | 本          | 不按官网直接上传GitHub/Discord；待实测                 |
| G12 [Troubleshooting](https://www.onorca.dev/docs/troubleshooting) | Help/反馈/离线手册       | 本机无网络                        | Help入口打开正确Forflow内容→日志位置正确→反馈提交前预览目标与附件                        | 本/网/外写  | 现有离线手册不等于已内嵌帮助站；待实测                 |
| G13 [Settings](https://www.onorca.dev/docs/settings)               | Forflow企业身份扩展      | 独立测试身份服务                  | HTTPS地址校验→登录/退出/revoke→管理员成员操作→非管理员无管理入口                         | 本/网/权    | 上游无等价功能；不是SSO或项目ACL验收；待条件           |
| G14 [Telemetry](https://www.onorca.dev/docs/telemetry)             | 数据保留与授权范围扩展   | 合成数据、指定存储目录            | 核对项目/历史/缓存/日志归属及删除实际范围；既有模型/浏览器进程不因企业退出假停           | 本/删       | data-and-evidence是设计，企业数据网关/多用户授权未实现 |
| G15 [Browser](https://www.onorca.dev/docs/browser/overview)        | 上传确认及网站权限扩展   | 本地接收服务+合成文件             | 上传Cancel→接收0字节；Allow→exact hash；导航后旧授权失效；相机/麦克风/剪贴板按来源分别验 | 本/网/权    | Forflow增强；terminal/MCP不必经同一确认，勿扩大保障    |

## 官网57页覆盖索引

下表保证导航正文都有归属。测试细项的粒度由上面矩阵定义；目录总数不是通过数。首页为产品模型说明，纯营销内容不独立测试；发布日志及营销/下载站点不纳入功能通过率。

| 官网页面                                                                                  | 本地正文                                              | 矩阵ID                                 |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| [Agents feed](https://www.onorca.dev/docs/activity)                                       | `docs/site/content/docs/activity.mdx`                 | G02                                    |
| [Claude Code in Orca](https://www.onorca.dev/docs/agents/claude-code)                     | `docs/site/content/docs/agents/claude-code.mdx`       | B05                                    |
| [Hot-swap Codex accounts](https://www.onorca.dev/docs/agents/codex-hot-swap)              | `docs/site/content/docs/agents/codex-hot-swap.mdx`    | B10、B11                               |
| [Codex in Orca](https://www.onorca.dev/docs/agents/codex)                                 | `docs/site/content/docs/agents/codex.mdx`             | B06、B07                               |
| [Cursor CLI in Orca](https://www.onorca.dev/docs/agents/cursor-cli)                       | `docs/site/content/docs/agents/cursor-cli.mdx`        | B08                                    |
| [How to use GLM-5.2 in Orca ADE](https://www.onorca.dev/docs/agents/glm-agent)            | `docs/site/content/docs/agents/glm-agent.mdx`         | B09                                    |
| [Agent hibernation](https://www.onorca.dev/docs/agents/hibernation)                       | `docs/site/content/docs/agents/hibernation.mdx`       | B16、B17                               |
| [Agent hooks & memory](https://www.onorca.dev/docs/agents/hooks-memory)                   | `docs/site/content/docs/agents/hooks-memory.mdx`      | B19、B20                               |
| [Chat UI (native chat)](https://www.onorca.dev/docs/agents/native-chat)                   | `docs/site/content/docs/agents/native-chat.mdx`       | B12、B13                               |
| [Agent session history](https://www.onorca.dev/docs/agents/session-history)               | `docs/site/content/docs/agents/session-history.mdx`   | B14、B15                               |
| [Supported agents](https://www.onorca.dev/docs/agents/supported)                          | `docs/site/content/docs/agents/supported.mdx`         | B01                                    |
| [Usage & rate-limit tracking](https://www.onorca.dev/docs/agents/usage-tracking)          | `docs/site/content/docs/agents/usage-tracking.mdx`    | B18                                    |
| [Install Orca Mobile on Android](https://www.onorca.dev/docs/android-apk)                 | `docs/site/content/docs/android-apk.mdx`              | F12                                    |
| [Design Mode](https://www.onorca.dev/docs/browser/design-mode)                            | `docs/site/content/docs/browser/design-mode.mdx`      | C13                                    |
| [Per-worktree browser](https://www.onorca.dev/docs/browser/overview)                      | `docs/site/content/docs/browser/overview.mdx`         | C07、C08、C09、C10、G15                |
| [Browser-use profiles](https://www.onorca.dev/docs/browser/profiles)                      | `docs/site/content/docs/browser/profiles.mdx`         | C11、C12                               |
| [Scheduled automations](https://www.onorca.dev/docs/cli/automations)                      | `docs/site/content/docs/cli/automations.mdx`          | E09、E10、E11                          |
| [Computer use](https://www.onorca.dev/docs/cli/computer-use)                              | `docs/site/content/docs/cli/computer-use.mdx`         | E17、E18                               |
| [Orchestration](https://www.onorca.dev/docs/cli/orchestration)                            | `docs/site/content/docs/cli/orchestration.mdx`        | E12、E13、E14、E15                     |
| [Orca CLI overview](https://www.onorca.dev/docs/cli/overview)                             | `docs/site/content/docs/cli/overview.mdx`             | E01                                    |
| [Orca CLI reference](https://www.onorca.dev/docs/cli/reference)                           | `docs/site/content/docs/cli/reference.mdx`            | E02、E03、E04                          |
| [Orca skills registry & MCP](https://www.onorca.dev/docs/cli/skills)                      | `docs/site/content/docs/cli/skills.mdx`               | E05、E06、E07、E08                     |
| [Worktree checkpoints](https://www.onorca.dev/docs/cli/worktree-checkpoints)              | `docs/site/content/docs/cli/worktree-checkpoints.mdx` | E16                                    |
| [File explorer & external drag-drop](https://www.onorca.dev/docs/editing/file-explorer)   | `docs/site/content/docs/editing/file-explorer.mdx`    | C21、C22                               |
| [Rich markdown editor](https://www.onorca.dev/docs/editing/markdown)                      | `docs/site/content/docs/editing/markdown.mdx`         | C17、C18                               |
| [Monaco editor & autosave](https://www.onorca.dev/docs/editing/monaco)                    | `docs/site/content/docs/editing/monaco.mdx`           | C15、C16                               |
| [HTML, Mermaid, PDF & image viewers](https://www.onorca.dev/docs/editing/viewers)         | `docs/site/content/docs/editing/viewers.mdx`          | C19、C20                               |
| [Your first 3-agent session](https://www.onorca.dev/docs/first-session)                   | `docs/site/content/docs/first-session.mdx`            | A03                                    |
| [Troubleshooting GitHub errors](https://www.onorca.dev/docs/github-errors)                | `docs/site/content/docs/github-errors.mdx`            | D15                                    |
| [What is Orca?](https://www.onorca.dev/docs)                                              | `docs/site/content/docs/index.mdx`                    | A01、A03、A17、F01                     |
| [Install](https://www.onorca.dev/docs/install)                                            | `docs/site/content/docs/install.mdx`                  | A01、A02                               |
| [Mobile companion](https://www.onorca.dev/docs/mobile)                                    | `docs/site/content/docs/mobile.mdx`                   | F09、F10、F11                          |
| [Agents & sessions](https://www.onorca.dev/docs/model/agents-sessions)                    | `docs/site/content/docs/model/agents-sessions.mdx`    | B02、B03、B04                          |
| [Quick Open & Jump Palette](https://www.onorca.dev/docs/model/quick-open)                 | `docs/site/content/docs/model/quick-open.mdx`         | A15、A16                               |
| [Session restore](https://www.onorca.dev/docs/model/session-restore)                      | `docs/site/content/docs/model/session-restore.mdx`    | A13、A14                               |
| [Tabs, panes & split layouts](https://www.onorca.dev/docs/model/tabs-panes-splits)        | `docs/site/content/docs/model/tabs-panes-splits.mdx`  | A11、A12                               |
| [Worktrees](https://www.onorca.dev/docs/model/worktrees)                                  | `docs/site/content/docs/model/worktrees.mdx`          | A04、A05、A06、A07、A08、A09、A10      |
| [Notifications & Inbox](https://www.onorca.dev/docs/notifications)                        | `docs/site/content/docs/notifications.mdx`            | G01                                    |
| [Fix a UI bug with Design Mode](https://www.onorca.dev/docs/recipes/design-mode-fix)      | `docs/site/content/docs/recipes/design-mode-fix.mdx`  | C14                                    |
| [Jump between 10 worktrees](https://www.onorca.dev/docs/recipes/jump-worktrees)           | `docs/site/content/docs/recipes/jump-worktrees.mdx`   | A18                                    |
| [Race three agents on the same task](https://www.onorca.dev/docs/recipes/parallel-agents) | `docs/site/content/docs/recipes/parallel-agents.mdx`  | A17                                    |
| [Work on a remote machine over SSH](https://www.onorca.dev/docs/recipes/remote-worktrees) | `docs/site/content/docs/recipes/remote-worktrees.mdx` | F05                                    |
| [Review an AI diff line-by-line](https://www.onorca.dev/docs/recipes/review-ai-diff)      | `docs/site/content/docs/recipes/review-ai-diff.mdx`   | D14                                    |
| [Remote Orca Servers](https://www.onorca.dev/docs/remote-servers)                         | `docs/site/content/docs/remote-servers.mdx`           | F06、F07                               |
| [Annotate AI Diff](https://www.onorca.dev/docs/review/annotate-ai-diff)                   | `docs/site/content/docs/review/annotate-ai-diff.mdx`  | D04                                    |
| [Attribution](https://www.onorca.dev/docs/review/attribution)                             | `docs/site/content/docs/review/attribution.mdx`       | D05                                    |
| [Commit & push from Orca](https://www.onorca.dev/docs/review/commit-push)                 | `docs/site/content/docs/review/commit-push.mdx`       | D06、D07、D08                          |
| [Diff viewer](https://www.onorca.dev/docs/review/diff-viewer)                             | `docs/site/content/docs/review/diff-viewer.mdx`       | D01、D02、D03                          |
| [Hosted reviews, issues & Actions](https://www.onorca.dev/docs/review/github)             | `docs/site/content/docs/review/github.mdx`            | D09、D10、D11                          |
| [Jira items drawer](https://www.onorca.dev/docs/review/jira)                              | `docs/site/content/docs/review/jira.mdx`              | D13                                    |
| [Linear items drawer](https://www.onorca.dev/docs/review/linear)                          | `docs/site/content/docs/review/linear.mdx`            | D12                                    |
| [Settings reference](https://www.onorca.dev/docs/settings)                                | `docs/site/content/docs/settings.mdx`                 | G03、G04、G05、G06、G07、G08、G10、G13 |
| [SSH worktrees](https://www.onorca.dev/docs/ssh)                                          | `docs/site/content/docs/ssh.mdx`                      | F02、F03、F04                          |
| [Privacy & Telemetry](https://www.onorca.dev/docs/telemetry)                              | `docs/site/content/docs/telemetry.mdx`                | G09、G14                               |
| [Terminal](https://www.onorca.dev/docs/terminal)                                          | `docs/site/content/docs/terminal.mdx`                 | C01、C02、C03、C04、C05、C06           |
| [Troubleshooting & FAQ](https://www.onorca.dev/docs/troubleshooting)                      | `docs/site/content/docs/troubleshooting.mdx`          | G11、G12                               |
| [Ways to run Orca](https://www.onorca.dev/docs/ways-to-run)                               | `docs/site/content/docs/ways-to-run.mdx`              | F01、F08                               |

## 实际执行结果的映射约定

矩阵共 **120个稳定ID**（A01–A18、B01–B20、C01–C22、D01–D15、E01–E18、F01–F12、G01–G15）；B01供应商、C20格式、D09平台、F04认证等还需按括号子项分别记结果。一个ID有部分未验时，不得把整行标通过。新增用例追加ID，避免重排编号影响父任务结果映射。

结果记录至少包含：`ID/子项、版本与包指纹、执行主机/OS、profile及测试仓库、输入fixture版本、实际动作、预期与实际、判定、证据路径、未覆盖边界`。失败或待条件应列具体阻碍；预期禁用以“产品差异／阻断符合预期”记录。文档冲突记录现场行为及产品决定，不能悄悄降低验收。

建议先执行不依赖账号的A/C及D01–D07、E01–E06、E09、E12、E14、E16、G03–G05/G09–G12/G15；实际Agent工作树创建和并行任务由父任务及UI代理独立留证，映射A17/B03/B06，不由本清单推断通过。远端、真实provider、手机、外部发布分别保留条件。时区计划至少覆盖IANA时区与DST跳变/重复时刻，防止仅保存字符串却不影响nextRunAt；E10以实际触发时间和去重记录验收。

本轮没有启动应用、操作桌面、读取密钥或执行模型调用；没有修改产品代码、真实CLI和系统权限。此文件仅是验收清单，不是已完成的功能验收报告。
