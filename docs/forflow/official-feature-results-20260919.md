# 官方功能实际验收矩阵（2026-09-19）

本矩阵对应[原120项清单](official-feature-checklist-20260919.md)，保留原验收范围。安装仍为 `1.4.205-forflow.8`（macOS arm64、cn-private）；`.9` 最终候选已构建并通过12个安装包场景，尚未覆盖运行中的 `.8`。本轮 CUA 进行中报告已归档，桌面因交互冲突暂停；只支持报告中明确观察的子项。没有任何整行标为全流程通过。

## 版本与证据层级

- 本轮本机工作流27文件373测试 + Agent/设置16文件196测试 = **43文件569测试**；后端22文件248测试；合计 **65文件817测试**。全部绿不等于无缺陷：时区/DST已有明确反例。语言缓存/Esc另有6文件22修复回归，不并入817。
- 早前安装测试为同指纹 `.8`：11场景通过，运行开始 `2026-09-19T14:42:26.493Z`。旧 CUA 的14项修复观察也属早前证据，不声称本轮重跑。app.asar SHA256：`4b40bef7b2db2d74b8b65f4cce5b5d8f66e65f756b67badf7a311cf258da8fc1`。
- 本轮真实runtime证据包括新工作树、注记、PTY输出、分屏/关闭和disabled计划CRUD；双Codex为实际模型任务，父端集成是本地Git操作，不是产品源控UI验收。
- 单元、mock组件、真实临时文件/SQLite、包内真实操作、可见CUA分别记录；旧源码测试与当前安装包不互换。

最终 `.9` 源码 `ca3690f179c1a40e8512539114c1ed8b1ea89bab`，165文件1,575回归、11身份服务测试、12安装包场景通过，无失败或跳过。新包指纹 `9a8b30072a4b43355d950c27425b541882632a751650f46cb766f5ca731aaef2`。这些结果与旧包CUA分开记录，[P9]为最终包证据。

补充执行18文件242测试和14文件167测试，涉及原未执行20项的部分机制；每项的真实FS／socket与mock边界见[X]、[Y]。语音仍未执行，缺真实设备与模型验收。

## 状态计数（恰好120项）

| 状态 | 数量 |
| --- | ---: |
| 已发现缺陷 | 5 |
| 待账号或主机 | 34 |
| 未执行 | 1 |
| 私有版预期阻断 | 5 |
| 部分验证 | 75 |
| 合计 | 120 |

“部分验证”仅支持该行已验证子项；“私有版预期阻断”是产品差异，不是官网联网流程失败。未实现子项直接写在条件栏，不把整个混合条目粗略判为不存在。

## 证据索引

[L]: ../../.forflow/evidence/official-feature-audit-20260919/local-workflows/report.md
[S]: ../../.forflow/evidence/official-feature-audit-20260919/local-workflows/agent-settings-report.md
[B]: ../../.forflow/evidence/official-feature-audit-20260919/backend/report.md
[TZ]: ../../.forflow/evidence/official-feature-audit-20260919/backend/timezone-repro.json
[P]: ../../.forflow/evidence/private-v8-installed/packaged-tests.json
[V]: ../../.forflow/evidence/computer-use-v8-20260919/qa-report.md
[R]: ../../.forflow/evidence/official-feature-audit-20260919/
[PTY]: ../../.forflow/evidence/official-feature-audit-20260919/cli-pty-output-proof.json
[Q]: ../../.forflow/evidence/official-feature-audit-20260919/parallel-before-merge.json
[M]: ../../.forflow/evidence/official-feature-audit-20260919/parallel-integration.json
[U]: ../../.forflow/evidence/official-feature-audit-20260919/computer-use/qa-report.md
[P9]: ../../.forflow/evidence/private-v9-packaged/packaged-tests.json
[TF]: ../../.forflow/evidence/official-feature-audit-20260919/backend/timezone-fix-report.md
[X]: ../../.forflow/evidence/official-feature-audit-20260919/backend/additional-local-test-evidence.md
[Y]: ../../.forflow/evidence/official-feature-audit-20260919/backend/additional-remaining-evidence.md
[T]: ../../.forflow/evidence/official-feature-audit-20260919/backend/tour-fix-report.md

- [L] 本机工作流报告及 suite-mapping.json；[S] Agent/设置报告及 agent-settings-mapping.json，均保留测试层级与文件指纹。
- [B] 后端报告；[TZ] 时区反例；[T] 源码语言修复报告。
- [P] 早前同指纹包11场景；[V] 早前CUA14项；[R] 本轮 cli-*.json；[PTY] 独立文件回读证明。
- [Q] 两Agent限定文件范围；[M] 父端本地合并和9测试观测记录（引用exec chunk，未冒充保存原始log）；[U] 本轮CUA进行中报告及截图，包含暂停点与未验子项。

## 逐项结果

### A 组

| ID／官网 | 验收对象 | 当前状态 | 已验证子项 | 未验证条件／缺陷与差异 | 证据 |
| --- | --- | --- | --- | --- | --- |
| A01 [Install](https://www.onorca.dev/docs/install) | 包身份与首次启动 | 部分验证 | 早前安装 .8 包身份、中文首次引导和隔离配置启动通过；安装指纹见 P/V。 | .9 最终候选12场景通过但尚未安装；其他平台、真实配置启动性能仍未验。[P9] | [P] [V] |
| A02 [Install](https://www.onorca.dev/docs/install) | 更新与其他平台 | 私有版预期阻断 | cn-private 不使用上游自动更新；管理员分发是产品差异。 | Windows/Linux 安装、升级、卸载未覆盖；不是跨平台通过。 | [S] [V] |
| A03 [First session](https://www.onorca.dev/docs/first-session) | 首个完整流程 | 部分验证 | 早前同指纹 .8 实际项目→工作树→中文终端→文件编辑→diff→重启；本轮 CLI 创建再次成功。 | 产品内本地提交及完整连续首会话验收尚缺。 | [P] [R] |
| A04 [Worktrees](https://www.onorca.dev/docs/model/worktrees) | 创建基线选择 | 部分验证 | 本轮真实从 main 创建测试工作树；创建参数测试及真实 Git 同名远端分支冲突测试通过。 | 已有分支、SHA、远端基线逐项 UI 创建尚缺。 | [L] [R] |
| A05 [Worktrees](https://www.onorca.dev/docs/model/worktrees) | 后台创建、取消、失败重试 | 部分验证 | worktree-create-preparation-cancellation.test.ts 6/6（mock准备/取消状态机）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [L] |
| A06 [Worktrees](https://www.onorca.dev/docs/model/worktrees) | 多仓库项目组、普通文件夹 | 部分验证 | folder-workspace-catalog.test.ts 7/7（store目录合并单元）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [L] |
| A07 [Worktrees](https://www.onorca.dev/docs/model/worktrees) | 共享目录与复制 | 部分验证 | worktree-shared-directories.test.ts 19/19（临时Git仓库及真实文件系统，共享目录）；worktree-include-file.test.ts 11/11（真实临时文件系统；Git check-ignore为mock，仅解析及路径选择）；worktree-include-copy-budget.test.ts 27/27（真实临时文件系统复制/链接与字节、条目预算；不含GUI）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [L] |
| A08 [Worktrees](https://www.onorca.dev/docs/model/worktrees) | 编辑名称、来源和层级 | 部分验证 | 20条血缘解析规则通过 | 纯数据验证层级与关系；未执行双击改名、issue编辑、子树删除/休眠UI。需隔离父子工作区及界面操作 | [Y] |
| A09 [Worktrees](https://www.onorca.dev/docs/model/worktrees) | 外部worktree发现 | 部分验证 | new-external-worktrees-inbox-actions.test.ts 4/4（mock发现/显示动作）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [L] |
| A10 [Worktrees](https://www.onorca.dev/docs/model/worktrees) | 资源清理与保留分支 | 部分验证 | 4条safe branch -d、不删除未合并分支路径通过 | Git/垃圾箱均mock，未实际删除工作树或测试分支；Resource Manager筛选排序和Review Branches未验 | [Y] |
| A11 [Tabs/panes](https://www.onorca.dev/docs/model/tabs-panes-splits) | 标签拖放、嵌套分屏 | 部分验证 | 真实 CLI split 后列表为两个终端，closeall 后 count=0；布局组件回归通过。 | 跨组拖放、嵌套方向、比例、浏览器/编辑器组合未全验。 | [L] [R] |
| A12 [Tabs/panes](https://www.onorca.dev/docs/model/tabs-panes-splits) | 快捷键与批量关闭 | 部分验证 | 12条tab类型cycle通过 | 纯标签路由；实际快捷键及批量关闭保留非editor未验。需隔离多类型标签 | [Y] |
| A13 [Session restore](https://www.onorca.dev/docs/model/session-restore) | 应用退出后暖恢复 | 部分验证 | 早前 .8 重启后文件及界面偏好回读；本轮布局/恢复单元通过。 | 未独立证明守护进程 PID、全部 tab 及焦点跨重启恢复。 | [L] [P] |
| A14 [Session restore](https://www.onorca.dev/docs/model/session-restore) | daemon丢失后的恢复 | 部分验证 | 24条失联/重生/旧输入拒绝/单次并发respawn/存活会话保护通过 | 临时目录+真实DaemonServer/Client socket，PTY subprocess和健康检查被mock；未杀用户daemon，未验真实应用重开布局/已存输出 | [Y] |
| A15 [Quick Open](https://www.onorca.dev/docs/model/quick-open) | 文件快开与统一+搜索 | 部分验证 |当前CUA Cmd+P输入sample并回车成功打开文件；quick-open-search.test.ts 13/13（搜索排序/合并单元）；| 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 |[L] [U]|
| A16 [Jump Palette](https://www.onorca.dev/docs/model/quick-open) | 跨树跳转、范围与键盘 | 部分验证 | WorktreeJumpPalette.recent-tabs.behavior.test.tsx 11/11（happy-dom组件交互）；worktree-jump-palette-interleaved-sections.test.tsx 9/9（happy-dom分组展示）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [L] |
| A17 [Parallel recipe](https://www.onorca.dev/docs/recipes/parallel-agents) | 三Agent同题比较 | 部分验证 | 两个真实 Codex（gpt-6-astra medium）并行完成；A/B 分别仅改3/2文件；父端本地 Git 合并后9/9测试，clean且无remote。 | 原清单三任务规模未验；父端 Git merge 不是产品 UI merge。 | [Q] [M] [U] |
| A18 [Jump recipe](https://www.onorca.dev/docs/recipes/jump-worktrees) | 10工作区导航端到端 | 部分验证 |当前CUA在qa-ui、qa-logic、两沙箱main之间实际切换且内容隔离；WorktreeJumpPalette.recent-tabs.behavior.test.tsx 11/11（happy-dom组件交互）；| 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 |[L] [U]|

### B 组

| ID／官网 | 验收对象 | 当前状态 | 已验证子项 | 未验证条件／缺陷与差异 | 证据 |
| --- | --- | --- | --- | --- | --- |
| B01 [Supported agents](https://www.onorca.dev/docs/agents/supported) | 目录和实际host检测 | 部分验证 | 本轮真实启动两个 Codex；早前国内执行器发现导航通过。 | 每个供应商的启动、认证、实际状态与远端检测仍需独立验收。 | [Q] [P] |
| B02 [Agents/sessions](https://www.onorca.dev/docs/model/agents-sessions) | 权限启动默认值 | 部分验证 | 当前 CUA 记录 scoped approval，未把审批提示当成无权限运行；已归档；审批仅本次约定文件与提交命令。 | 完整脱敏 argv、每 CLI reset 隔离及默认策略全量未验。 | [U] |
| B03 [Agents/sessions](https://www.onorca.dev/docs/model/agents-sessions) | 状态与重启chip | 部分验证 | 两个真实 Agent working/完成有截图与产物。 | waiting、blocked、exit、重启 chip 及所有读端一致尚缺。 | [Q] [U] |
| B04 [Agent dashboard](https://www.onorca.dev/docs/model/agents-sessions) | 看板、搜索、过滤、子代理 | 部分验证 | 3条board filtering通过 | 纯合成输入筛选；实验开关、popout同步、真实host badge和点击父terminal未验 | [Y] |
| B05 [Claude](https://www.onorca.dev/docs/agents/claude-code) | Claude启动、hook、团队 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；经授权Claude测试账号；启动最小任务→核对cwd/status/用量→单独验证后台子代理和Teams子行 | — |
| B06 [Codex](https://www.onorca.dev/docs/agents/codex) | Codex、账户home与重启 | 部分验证 | 真实 Codex 完成双任务；隔离 session home 与 wrong-account 回归通过。 | 两个实际账户切换、重启及子代理行定位未验。 | [S] [Q] |
| B07 [Codex](https://www.onorca.dev/docs/agents/codex) | Continue in New Session | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；含合成上下文会话；Continue→同/不同CLI新会话收到有界交接→旧会话保留且未当成resume | — |
| B08 [Cursor](https://www.onorca.dev/docs/agents/cursor-cli) | Cursor检测、状态、重启 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；固定Cursor CLI及测试认证；启动→正确cwd/实际模型→状态→退出重启 | — |
| B09 [GLM](https://www.onorca.dev/docs/agents/glm-agent) | GLM兼容执行器 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；获准endpoint/model，负责人配置凭据；通过指定Claude/OpenCode等执行器发最小请求→查模型回执；失败不自动换域 | — |
| B10 [Hot-swap](https://www.onorca.dev/docs/agents/codex-hot-swap) | Claude/Codex账户切换 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；两测试账户，不展示凭据；切换→新进程新身份，旧进程原身份→并发切换保护→重启身份核对 | — |
| B11 [Hot-swap](https://www.onorca.dev/docs/agents/codex-hot-swap) | config同步失效恢复 | 部分验证 | config-sync-stall.test.ts 15/15（隔离合成配置last-good及失败告警）；codex-config-mirror.test.ts 34/34（真实临时home配置镜像）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [S] |
| B12 [Native Chat](https://www.onorca.dev/docs/agents/native-chat) | 聊天发送、停止与问题 | 部分验证 | structured-agent-session-send-settlement.test.ts 10/10（mock session发送结算）；structured-agent-session-prompt-cancel.test.ts 5/5（mock session取消）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [S] |
| B13 [Native Chat](https://www.onorca.dev/docs/agents/native-chat) | 草稿附件、slash、模型选项 | 部分验证 | native-chat-draft-cache.test.ts 4/4（草稿缓存状态）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [S] |
| B14 [History](https://www.onorca.dev/docs/agents/session-history) | 发现、scope、筛选与排序 | 部分验证 | 合成 Codex JSONL 真实读取6项+mock分块流3项通过；早前历史导航检查。 | scope/筛选/排序 UI 未全验；CodeBuddy/Qoder CN 历史读取未实现。 | [S] [P] |
| B15 [History](https://www.onorca.dev/docs/agents/session-history) | 打开日志和恢复 | 部分验证 | session home36项、wrong-account5项：临时路径与恢复参数边界通过。 | 没有实际恢复历史会话或逐项执行 Copy/Open/Reveal。 | [S] |
| B16 [Hibernation](https://www.onorca.dev/docs/agents/hibernation) | 自动休眠与恢复 | 部分验证 | agent-hibernation-planner.test.ts 48/48（合成状态休眠规划器）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [S] |
| B17 [Hibernation](https://www.onorca.dev/docs/agents/hibernation) | 编排/移动/子代理保护 | 部分验证 | agent-hibernation-planner.test.ts 48/48（合成状态休眠规划器）；agent-hibernation-runtime-liveness-race.test.ts 1/1（mock运行存活/状态竞争）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [S] |
| B18 [Usage](https://www.onorca.dev/docs/agents/usage-tracking) | 用量窗口及账户归属 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；合成limit状态+获准只读provider；used/remaining、reset time、80%警告、detailed/compact切换→空值不能显示0→账户切换跟随 | — |
| B19 [Hooks/memory](https://www.onorca.dev/docs/agents/hooks-memory) | setup hook及说明文件 | 部分验证 | 61项；runner脚本文本构造与argv选择，文件/子进程mock；没有运行用户脚本 | 创建worktree真正跑一次setup、说明文件保留、状态hook开关不覆盖用户hooks | [X] |
| B20 [Hooks/memory](https://www.onorca.dev/docs/agents/hooks-memory) | 应用重启后hook重连 | 部分验证 | 14项；真实AgentHookServer启动/停止/再启动，临时endpoint文件刷新、owner-only权限、临时文件清理；仅合成内容被/bin/sh source | 完整app重启后长寿命agent发送hook→UI更新 | [X] |

### C 组

| ID／官网 | 验收对象 | 当前状态 | 已验证子项 | 未验证条件／缺陷与差异 | 证据 |
| --- | --- | --- | --- | --- | --- |
| C01 [Terminal](https://www.onorca.dev/docs/terminal) | PTY、中文与键盘 | 部分验证 | 早前真实中文 PTY；本轮 terminal-send 生成 cli-proof.txt，独立回读 exact bytes=FORFLOW_CLI_REAL_PTY_OK\n。 | ANSI/resize/Ctrl-C、特殊键和JIS尚未逐项验证。 | [P] [PTY] |
| C02 [Terminal](https://www.onorca.dev/docs/terminal) | 搜索、拷贝上下文、OSC52 | 部分验证 | 54项；真实xterm+SearchAddon在happy-dom测试长行普通/regex/whole-word搜索；OSC52解码、UTF8、开关门禁与mock写入 | Copy Context完整有界流程；真实桌面剪贴板；全部搜索UI导航 | [X] |
| C03 [Terminal](https://www.onorca.dev/docs/terminal) | 链接popover与修饰键 | 部分验证 | 25项；合成link事件+mock路由覆盖OSC URL与链接action | 真实popover/修饰键/文件复用tab | [X] |
| C04 [Terminal](https://www.onorca.dev/docs/terminal) | 主题与shell选择 | 部分验证 | 5项；Ghostty合成配置解析与导入预览，FS被mock | 真实主题导入回读、Warp/YAML、Windows shell切换 | [X] |
| C05 [Terminal](https://www.onorca.dev/docs/terminal) | 浮动工作台 | 部分验证 | 30项；React hook/render-probe模拟tab生命周期、快捷键，shell/browser/markdown保留策略 | 真正Electron浮动窗/焦点/目录设置 | [X] |
| C06 [Quick Commands](https://www.onorca.dev/docs/terminal) | 命令创建、作用域和执行 | 部分验证 | 23项；纯配置与scope规则、mock派发当前/新terminal | UI创建编辑删除及真实printf执行和跨host回读 | [X] |
| C07 [Browser](https://www.onorca.dev/docs/browser/overview) | 基本导航和树隔离 | 部分验证 | 早前内置浏览器场景通过；本轮55078任务板 add2/toggle/filter/delete1/reload保留1为 CUA 观察，已归档。 | 切树返回、空格输入及全部导航/恢复/scroll仍待；当前只记录已观察子项。 | [P] [U] |
| C08 [Browser](https://www.onorca.dev/docs/browser/overview) | popup、工具与视口 | 部分验证 | 11项；mocked Electron popup路由 | 真_blank/OAuth、新窗profile、DevTools、viewport/media query | [X] |
| C09 [Browser](https://www.onorca.dev/docs/browser/overview) | 下载及文件位置 | 部分验证 | 15项；9条relay真实临时目录/文件、分块与取消清理；6条Electron下载事件mock | HTTP下载起点及真实远端接收/进度UI/Open/Reveal | [X] |
| C10 [Browser](https://www.onorca.dev/docs/browser/overview) | 远端网络与本地渲染 | 待账号或主机 | backend宿主身份隔离回归通过。 | 需第二主机验证 DNS/HTTP/WS/loopback 与 streamed fallback。 | [B] |
| C11 [Profiles](https://www.onorca.dev/docs/browser/profiles) | partition隔离与UA | 部分验证 | browser host/client 与 execution-host storage identity 共18项通过。 | 真实多 partition cookie/localStorage/cache 与 UA/viewport 回读未验。 | [B] |
| C12 [Profiles](https://www.onorca.dev/docs/browser/profiles) | cookie导入与登录例外 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；合成cookie文件/测试账号；导入只替换目标域→其他域保留→Google跳过告警→直接登录与外置FIDO选择/取消另验 | — |
| C13 [Design Mode](https://www.onorca.dev/docs/browser/design-mode) | 元素取证到Agent | 部分验证 | 早前介绍改为 DOM/样式上下文，避免保证原始源码定位。 | 实际 picker 取证、发送与取消尚无完整证据。 | [V] |
| C14 [Design recipe](https://www.onorca.dev/docs/recipes/design-mode-fix) | UI问题闭环 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；C13+批准模型；选具体错位元素→发送修改指令→检查源文件与刷新后渲染→二次取证核对 | — |
| C15 [Monaco](https://www.onorca.dev/docs/editing/monaco) | 自动保存和查找编辑 | 部分验证 | 早前同指纹包实际中文编辑、读盘、diff、重启；本轮 autosave/search 等组件回归；当前 CUA 保存和搜索截图已归档。 | 多光标、选区种子搜索、定义跳转等未全验。 | [L] [P] [U] |
| C16 [Monaco](https://www.onorca.dev/docs/editing/monaco) | Changes view、wrap、font | 部分验证 | 4项；wrap选项纯逻辑与React组件给mock Monaco的字体继承/覆盖参数 | 真Changes mode光标保留、Alt-Z同步 | [X] |
| C17 [Markdown](https://www.onorca.dev/docs/editing/markdown) | 富文本/源码无损 | 部分验证 | Tiptap roundtrip48项和table20项实际文档模型通过；当前 CUA README富文本标题正文实际渲染。 | 真实富文本/源码往返、wiki跳转、全部slash与键盘操作未全验。 | [L] [U] |
| C18 [Markdown](https://www.onorca.dev/docs/editing/markdown) | 长文fallback、目录及标注 | 部分验证 | markdown-rich-size-limit.test.ts 4/4（大小fallback纯逻辑）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [L] |
| C19 [Viewers](https://www.onorca.dev/docs/editing/viewers) | HTML沙箱与资源授权 | 部分验证 | backend浏览器授权及导航撤销机制回归通过。 | 不等于 HTML viewer 额外目录、下载阻断和路径复制真实闭环。 | [B] |
| C20 [Viewers](https://www.onorca.dev/docs/editing/viewers) | Mermaid/PDF/图片/CSV/notebook | 部分验证 | PDF31项纯状态、CSV15项解析、notebook1项 mock Python timeout 通过。 | Mermaid/图片/PDF/CSV可见渲染及真实 notebook kernel 执行均未全验。 | [L] |
| C21 [Explorer](https://www.onorca.dev/docs/editing/file-explorer) | 文件操作与外部变化 | 部分验证 | 早前包测试打开文件树与 README。 | 增删重命名、自然排序、隐藏项及路径边界未全验。 | [P] |
| C22 [Explorer](https://www.onorca.dev/docs/editing/file-explorer) | 拖入、目录搜索、远端传输 | 待账号或主机 | 暂无对应完整执行证据。 | 远端传输、原生拖放和设备条件待配套。 | — |

### D 组

| ID／官网 | 验收对象 | 当前状态 | 已验证子项 | 未验证条件／缺陷与差异 | 证据 |
| --- | --- | --- | --- | --- | --- |
| D01 [Diff](https://www.onorca.dev/docs/review/diff-viewer) | 对比范围与文本diff | 部分验证 | 早前包内真实 Monaco diff；本轮 diff组件回归；当前 CUA diff 截图已归档。 | 行/块交互和大/二进制/重命名等边界未全验。 | [L] [P] [U] |
| D02 [Diff](https://www.onorca.dev/docs/review/diff-viewer) | 图片、HTML和逐行暂存 | 部分验证 | status-discard-and-bulk-staging.test.ts 10/10（Git/fs mock的暂存/丢弃命令）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [L] |
| D03 [Diff](https://www.onorca.dev/docs/review/diff-viewer) | 三方冲突解决 | 部分验证 | status-conflict-operations.test.ts 14/14（Git/fs mock的冲突操作）； | 原清单的界面/真实执行器闭环仍需实测；组件或隔离文件系统结果仅覆盖列出的断言。 | [L] |
| D04 [Annotate](https://www.onorca.dev/docs/review/annotate-ai-diff) | 行评论、锚点与批量发送 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；合成diff和测试接收Agent；添加/取消/保存→改行后锚点→Send菜单选Agent→有界一次批量→resolve后不重复发送 | — |
| D05 [Attribution](https://www.onorca.dev/docs/review/attribution) | AI/人工来源与导出 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；支持写入捕获的测试Agent；Agent写范围→marker→人工覆盖变更归属→导出metadata→Git提交不含自动元数据 | — |
| D06 [Commit/push](https://www.onorca.dev/docs/review/commit-push) | 暂存、commit与失败hook | 部分验证 | commit5项及失败hook7项回归通过；真实 Agent 工作树产生独立提交。 | 真实 Agent Git 提交与父端 merge 不等于产品 commit UI；amend/非ASCII/失败hook实操尚缺。 | [L] [Q] [M] |
| D07 [Commit/push](https://www.onorca.dev/docs/review/commit-push) | push/pull/sync与lease | 部分验证 | 43条Git remote参数和runtime sync路由通过 | 包含force-with-lease命令构造及拒绝结果处理；Git执行器/SSH provider为mock，无实际remote push/pull，也未用真实stale lease竞争检验 | [Y] |
| D08 [Commit/push](https://www.onorca.dev/docs/review/commit-push) | AI recipes与失败修复 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；获准CLI+合成失败hook；生成commit/PR文案→全局与repo recipe覆盖→Fix with AI仅修复不绕hook/自动发布→空结果明确报错 | — |
| D09 [Hosted reviews](https://www.onorca.dev/docs/review/github) | 多Git provider读/创建 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；各平台测试repo和授权身份；GitHub/GitLab/Bitbucket/Azure/Gitea逐个核对sidebar review、browser链接、checks；创建验证base/title/body | — |
| D10 [Hosted reviews](https://www.onorca.dev/docs/review/github) | 评论、反应、Actions与子pipeline | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；测试PR/MR及失败check；读thread顺序→reply指定评论→GitHub反应toggle→GitLab子pipeline日志→失败check交Agent | — |
| D11 [Hosted reviews](https://www.onorca.dev/docs/review/github) | merge/queue/stack | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；可销毁测试PR集合；eligibility控制→enable/disable auto-merge→queue→stack创建/顺序/merge范围确认→服务端回读 | — |
| D12 [Linear](https://www.onorca.dev/docs/review/linear) | issue抽屉、布局和来源 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；测试Linear workspace；list/board、分页、筛选/排序跨重启→描述详情→新issue草稿关闭再开→选issue创建树 | — |
| D13 [Jira](https://www.onorca.dev/docs/review/jira) | Cloud/Server多站点任务 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；测试Jira站点和账号；连接→All sites→读详情→允许transition/custom字段→草稿恢复→URL多站点辨别并创建树 | — |
| D14 [Review recipe](https://www.onorca.dev/docs/recipes/review-ai-diff) | 逐行审阅闭环 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；D01/D04+批准Agent；看diff→批量反馈→Agent修订→测试→逐条复审后Resolve | — |
| D15 [GitHub errors](https://www.onorca.dev/docs/github-errors) | 鉴权、限流、离线恢复 | 部分验证 | 23条错误分类+刷新限流预算通过 | 合成错误/客户端mock；未调用真实账号，未验证完整401/403/429/offline界面至恢复闭环。需只读测试repo和故障注入 | [Y] |

### E 组

| ID／官网 | 验收对象 | 当前状态 | 已验证子项 | 未验证条件／缺陷与差异 | 证据 |
| --- | --- | --- | --- | --- | --- |
| E01 [CLI overview](https://www.onorca.dev/docs/cli/overview) | 注册、PATH、版本 | 已发现缺陷 | 不可读 root0700全局链接真实复现；中文错误/刷新/危险操作禁用已在 .8 验；后续新链接/公共目录 umask 修复通过隔离FS回归。 | 现有 /usr/local/bin/forflow 未修改仍不可读；包内 launcher 可用不等于系统 PATH 安装完成。 | [P] [V] [B] |
| E02 [CLI reference](https://www.onorca.dev/docs/cli/reference) | 身份、help、JSON与host选择 | 已发现缺陷 | 包内 CLI 版本/help 和本轮真实 JSON 操作可运行。 | 英文及 orca 帮助残留；selector歧义/host选择全部边界尚缺。 | [B] [R] |
| E03 [CLI reference](https://www.onorca.dev/docs/cli/reference) | repo/worktree/file/terminal | 部分验证 | 真实工作树创建、注记回读、PTY发送输出文件校验、split两终端及closeall零终端。 | 完整 repo/file/wait 命令与界面一致性尚未逐命令验收。 | [R] [PTY] |
| E04 [CLI reference](https://www.onorca.dev/docs/cli/reference) | browser、account、emulator命令 | 已发现缺陷 | 当前 CUA 看到模拟器空设备说明硬编码英文，setup hook catch 露 raw IPC EACCES；源码窄修完成并通过18项定向测试，已打入 .9 候选，未安装。 | 不能据缺设备推定模拟器功能不可用；模拟器CLI及account/browser全套命令尚缺设备/测试。 | [U] |
| E05 [Skills](https://www.onorca.dev/docs/cli/skills) | 随包guide与发现 | 部分验证 | 本轮 cli-skill JSON及早前随包引导/离线技能场景。 | list/get/reference/full/json与所有执行器发现目录组合未全验。 | [R] [P] |
| E06 [Skills](https://www.onorca.dev/docs/cli/skills) | 本机安装、更新、冲突与删除 | 部分验证 | 3项真实临时目录安装测试覆盖冲突与受保护来源；早前包内离线技能测试。 | 真实用户技能目录未改；完整更新freshness/删除/remote分发待验。 | [S] [P] |
| E07 [Skills](https://www.onorca.dev/docs/cli/skills) | 公共分享与安装管理 | 私有版预期阻断 | 公共技能分享在私有版 handler/策略测试中拒绝。 | 不是官网公共分享成功；所有 UI/CLI 入口和独立网络捕获未全验。 | [S] |
| E08 [Skills/MCP](https://www.onorca.dev/docs/cli/skills) | MCP注册与调用 | 待账号或主机 | 尚无本轮对应执行证据。 | 需原清单指定测试账号/执行器/服务条件与相应动作范围；本地无害MCP stub+支持CLI；注册测试endpoint→发现工具→调echo→断线/删配置→工具不可继续可用 | — |
| E09 [Automations](https://www.onorca.dev/docs/cli/automations) | 创建禁用计划与管理 | 部分验证 | 真实 runtime disabled automation 创建、编辑、回读、删除后列表核对完成。 | UI管理筛选/排序/键盘未全验；timezone计算缺陷见E10。 | [R] |
| E10 [Automations](https://www.onorca.dev/docs/cli/automations) | 真运行、precheck与恢复 | 已发现缺陷 | backend precheck/refusal/completion测试通过；但timezone未参与nextRunAt计算，真实UTC09计划返回01Z；DST回拨next不前进。 | .9已修复：17文件182项相关回归通过，最终包disabled UTC→上海仅改时区CRUD通过；旧nextRunAt未批量迁移，旧计划需重新保存。未真实触发模型或跨主机计划。[TF] [P9] | [B] [TZ] [R] |
| E11 [Automations](https://www.onorca.dev/docs/cli/automations) | 多host所有权及离线 | 待账号或主机 | backend远端失联/所有权相关测试通过。 | 第二runtime/SSH实际计划创建、离线及恢复待验。 | [B] |
| E12 [Orchestration](https://www.onorca.dev/docs/cli/orchestration) | Run/Task/依赖与gate | 部分验证 | CLI/RPC及真实内存SQLite的Run/Task/gate依赖与原子性回归通过。 | 完整真实多worker/DAG流程尚未执行。 | [B] |
| E13 [Orchestration](https://www.onorca.dev/docs/cli/orchestration) | Dispatch、worker与模型偏好 | 部分验证 | tasks-dispatch32项回归通过；真实双Agent是人工建立的并行会话。 | 不能把人工双Agent当worker-start/dispatch receipt及结算全流程。 | [B] [Q] |
| E14 [Orchestration](https://www.onorca.dev/docs/cli/orchestration) | mailbox、wait、ACK、问答 | 部分验证 | 相关Run/RPC基础回归通过。 | mailbox重放/ACK/peek/group/ask真实参与者全链路未执行。 | [B] |
| E15 [Orchestration](https://www.onorca.dev/docs/cli/orchestration) | stop/release/retain/retry、跨host | 部分验证 | stop liveness、federation与partial relay inventory回归通过，失联保留unverifiable。 | 真实worker release/retain/retry和跨host输出保留待验。 | [B] |
| E16 [Checkpoints](https://www.onorca.dev/docs/cli/worktree-checkpoints) | 注记与卡片状态 | 部分验证 | 真实CLI写入comment/status并独立回读；CLI解析10项通过。 | UI卡片一致及已有旧约束合并保留未验；此项不是Git快照。 | [R] [B] |
| E17 [Computer use](https://www.onorca.dev/docs/cli/computer-use) | 能力与权限真实性 | 部分验证 | 早前包内权限API回读 accessibility granted / screenshot not-granted。 | Forflow自带原生截图/状态树/拒绝行为未实际完成；Codex CUA不替代它。 | [P] |
| E18 [Computer use](https://www.onorca.dev/docs/cli/computer-use) | 多窗口snapshot-act-snapshot | 待账号或主机 | 无Forflow原生helper端到端证据。 | 需授权独立应用/显示环境；snapshot-act-snapshot和stale index待验。 | — |

### F 组

| ID／官网 | 验收对象 | 当前状态 | 已验证子项 | 未验证条件／缺陷与差异 | 证据 |
| --- | --- | --- | --- | --- | --- |
| F01 [Ways to run](https://www.onorca.dev/docs/ways-to-run) | 执行位置与资源归属 | 待账号或主机 | 未执行真实第二主机/手机闭环。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 | — |
| F02 [SSH](https://www.onorca.dev/docs/ssh) | 保存、配置导入与host key | 待账号或主机 | 未执行真实第二主机/手机闭环。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 SSH官网默认保活5分钟与实现0（一直保活）有文档差异。[B] | — |
| F03 [SSH](https://www.onorca.dev/docs/ssh) | 远端文件/Git/terminal与断连 | 待账号或主机 | backend相关失联/relay/host边界回归通过；未建立真实双主机连接。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 | [B] |
| F04 [SSH](https://www.onorca.dev/docs/ssh) | auth边界与降级 | 待账号或主机 | 未执行真实第二主机/手机闭环。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 | — |
| F05 [SSH recipe](https://www.onorca.dev/docs/recipes/remote-worktrees) | 远端开发闭环 | 待账号或主机 | 未执行真实第二主机/手机闭环。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 | — |
| F06 [Remote servers](https://www.onorca.dev/docs/remote-servers) | 直连配对与撤销 | 待账号或主机 | backend相关失联/relay/host边界回归通过；未建立真实双主机连接。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 | [B] |
| F07 [Remote servers](https://www.onorca.dev/docs/remote-servers) | serve、所有权与多客户端 | 待账号或主机 | backend相关失联/relay/host边界回归通过；未建立真实双主机连接。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 | [B] |
| F08 [Cloud VM](https://www.onorca.dev/docs/ways-to-run) | recipe生命周期 | 待账号或主机 | 未执行真实第二主机/手机闭环。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 | — |
| F09 [Mobile](https://www.onorca.dev/docs/mobile) | 客户端配对、重连与版本 | 待账号或主机 | 未执行真实第二主机/手机闭环。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 | — |
| F10 [Mobile](https://www.onorca.dev/docs/mobile) | 工作区、Chat/terminal与附件 | 待账号或主机 | 未执行真实第二主机/手机闭环。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 | — |
| F11 [Mobile](https://www.onorca.dev/docs/mobile) | 创建、源控、浏览器与账号 | 待账号或主机 | 未执行真实第二主机/手机闭环。 | 需原清单对应获准主机/客户端；F09移动入口默认隐藏为私有版差异。 | — |
| F12 [Android](https://www.onorca.dev/docs/android-apk) | Android安装与升级 | 待账号或主机 | 尚无本轮Android APK安装和升级证据。 | 需要已授权的Android测试设备及对应安装包；模拟器面板英文/原始错误归入E04，不据此判定APK运行失败。 | — |

### G 组

| ID／官网 | 验收对象 | 当前状态 | 已验证子项 | 未验证条件／缺陷与差异 | 证据 |
| --- | --- | --- | --- | --- | --- |
| G01 [Notifications](https://www.onorca.dev/docs/notifications) | 通知真实送达与收件箱 | 部分验证 | 早前通知清单说明及应用开关完成状态验过。 | OS通知授权、真实送达/声音/收件箱定位未验。 | [V] |
| G02 [Agents feed](https://www.onorca.dev/docs/activity) | 跨树事件流 | 部分验证 | 12条event缓存身份、重复消除、工作区/host归属通过 | 真实纯数据事件builder；没有真实agent/reconnect触发或UI跳转，不能宣称完整事件流已验 | [Y] |
| G03 [Settings](https://www.onorca.dev/docs/settings) | 导航、搜索、语言、快捷键 | 已发现缺陷 | 早前 .8 中文设置/菜单场景通过；本轮发现引导语言缓存与中文Esc；源码a164eef3a修复6文件22测试通过。 | 安装仍 .8；.9候选已复验中文引导首步、分屏第二步、返回和Esc，且修复搜索复数、高级Off、默认状态及未读菜单；自定义标签保留。搜索/shortcut全量仍未验，候选包不当成安装完成。[P9] | [P] [V] [T] |
| G04 [Settings](https://www.onorca.dev/docs/settings) | 外观、缩放、状态栏和图标 | 部分验证 | 早前 theme/brand icon、Finder/about真实核对与包测试通过。 | Dock未测；density/font/zoom/状态栏全部设置未全验。 | [P] [V] |
| G05 [Settings](https://www.onorca.dev/docs/settings) | Git/repo/Tasks设置 | 部分验证 | 3条repo hook draft保留script字段、脏状态比较、YAML投影通过 | 仅hook设置子项；base/signing/Open in/rename recipe/task source/emoji/重启回读仍需隔离设置环境 | [Y] |
| G06 [Settings](https://www.onorca.dev/docs/settings) | 语音输入和模型 | 未执行 | 尚无本轮对应执行证据。 | 麦克风授权，预置离线模型；toggle/hold→开始/停止→设备失效fallback→输入识别；云语音另验 | — |
| G07 [Settings](https://www.onorca.dev/docs/settings) | 插件系统和marketplace | 私有版预期阻断 | 私有版云plugin获取边界在handler/策略回归中拒绝。 | 离线plugin预览/启用/更新/回滚/禁用生命周期未执行。 | [S] |
| G08 [Settings](https://www.onorca.dev/docs/settings) | Keep awake与资源管理器 | 部分验证 | 23条awake服务模式/新鲜度/生命周期/平台断言策略通过 | Electron powerSaveBlocker与powerMonitor为mock；未创建OS实际assertion，未验系统CPU/memory对照。需独立可销毁进程及OS assertion只读核验 | [Y] |
| G09 [Telemetry](https://www.onorca.dev/docs/telemetry) | 上游遥测、诊断外发 | 私有版预期阻断 | 遥测/诊断云handler策略测试通过；早前身份离线不回退上游。 | 无全流量独立抓包，不宣称所有进程零外发。 | [S] [P] |
| G10 [Artifacts](https://www.onorca.dev/docs/settings) | HTML/MD公共发布阻断 | 私有版预期阻断 | 公共artifact上传endpoint私有策略拒绝通过。 | editor/browser/CLI每个入口尚未逐一实操；本地HTML预览不等于发布。 | [S] |
| G11 [Troubleshooting](https://www.onorca.dev/docs/troubleshooting) | 故障可恢复与日志 | 部分验证 | 真实CLI EACCES中文警示可刷新、无永久loading；backend多种拒绝测试。 | 本轮模拟器 raw IPC EACCES另有缺陷见E04；全部故障/日志脱敏尚缺。 | [V] [B] [U] |
| G12 [Troubleshooting](https://www.onorca.dev/docs/troubleshooting) | Help/反馈/离线手册 | 部分验证 | 早前Help产品介绍11页及8项设置说明实际打开。 | 完整离线帮助站未内嵌；反馈附件预览和日志路径全流程未验。 | [V] |
| G13 [Settings](https://www.onorca.dev/docs/settings) | Forflow企业身份扩展 | 部分验证 | 早前同指纹 .8 实际隔离loopback身份服务登录/成员/撤销/重启/退出/离线无fallback。 | 不是生产身份服务、企业SSO或项目/数据ACL验收。 | [P] |
| G14 [Telemetry](https://www.onorca.dev/docs/telemetry) | 数据保留与授权范围扩展 | 部分验证 | session retention真实临时SQLite5项、terminal history文件权限14项通过。 | 全数据归属/删除链路未全验；企业数据网关与多用户工作区授权未实现。 | [S] |
| G15 [Browser](https://www.onorca.dev/docs/browser/overview) | 上传确认及网站权限扩展 | 部分验证 | 早前真实上传Cancel零字节、Allow exact bytes及导航撤销；backend staging/transfer和权限回归通过。 | 相机/麦克风/剪贴板设备与远端组合未全验；不涵盖terminal/MCP外发。 | [P] [B] |

## 暂停点与待补证据

1. 本轮CUA进行中报告已归档：任务板已观察add/toggle/filter/delete/reload及空字段required阻止；切树返回与纯空白字符输入仍待。模拟器面板非代理主动创建，桌面操作已暂停，不补推断。
2. `.9` 安装与指纹、引导语言/Esc和模拟器错误修复复验。当前没有以构建完成代替安装验证。
3. 未实现：CodeBuddy/Qoder CN历史读取、内嵌离线帮助站、企业数据网关/多用户项目ACL等仅记当前差异；不以设计文档存在当实现。

父任务最新进度：.9首候选包测10/11；新增tour测试全局返回按钮定位歧义，正在收窄选择器复测，不记录全通过。模拟器源码修复18项定向测试通过；搜索复数、工作区状态/未读菜单、Off仍在修。最终修复包尚未重建或安装，需父任务补最终证据路径。

## 最终包与原失败记录

首候选tour回归曾因全局“返回”按钮命中两项而失败；限定到引导面板后同包复测通过。修复前的真实包时区测试明确得到UTC09对应01Z，最终包得到正确09Z。最终构建曾被中文复数目录键缺失阻止，补齐后重新执行完整构建与回归，没有绕过校验。早期失败及复测原始记录在本机 `private-v9-first-candidate-*`、`private-v9-catalog-gate-attempt-*`，交付包的 `qa/failure-history/` 一并保存。
