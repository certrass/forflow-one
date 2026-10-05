# Orca v1.4.206 集成试验

2026-09-21。用户要求“把这些补充进来尝试”。本轮选择已发布的 v1.4.206，全量三方试合并到独立工作树；未纳入发布后的 main 提交，未改写原开发工作树或安装应用。

## 版本与产物

- 集成分支：`codex/upstream-v1.4.206`。Forflow 起点：`5d2a73ea97a3`；上游：`c62eca3988ce4d7fce12fbfd20c0c47b39e9ecac`。
- 当前状态：19 个文本冲突全部解决，仍处于 **未提交的试合并**，未合入原开发分支、未推送。不得 squash 掉后续正式合并的上游祖先关系。
- 候选版本：`1.4.206-forflow.1`，macOS arm64、本机 ad-hoc 签名。
- 应用：`~/Library/Caches/Forflow One/builds/1.4.206-forflow.1/mac-arm64/Forflow One.app`。
- ASAR SHA-256：`b17b3b92cee5abea70ea4cfa9ddd2352d098d4cb9367d5d1b571a37d5cc19a17`。
- 本轮结束时回读 `/Applications/Forflow One.app` 为 `1.4.205-forflow.25`；本轮没有安装、替换或启动该安装版。
- 证据目录：本工作树 `.forflow/evidence/upstream-1.4.206/`。`proof.json` 将源码文件指纹、上游 SHA、构建、测试和包哈希关联；原始失败日志保留。

## 已纳入的能力与适配

各功能的面板／设置位置、开启条件及尚缺接线见 [功能入口清单](upstream-v1.4.206-feature-entrypoints.md)。后续源码核对确认：移动网页资源已打包，但手机端混合网页界面仍仅在开发模式下可开启，正式手机构建强制关闭；不能从本段“纳入移动端更新”推定普通手机用户已有可用入口。

后续“继续修正”已修复默认 Shell 编辑和设置搜索入口，6 文件／79 项专项、Web 类型检查、8 个改动源码文件的六类质量扫描及中英文目录通过，证据文件以 `entrypoint-fixes-` 为前缀。**这些后续源码修改尚未重新打包；本记录的 `.1` 包哈希及原 `proof.json` 仅对应初次集成候选。**

随后接通本机 Codex 全文搜索到既有 Review，按实际日志路径核对来源，保留原索引授权和有界审阅范围。5 文件／53 项专项、主进程／Web 类型检查、本轮 10 个源码文件六类质量扫描及中英文 15,729 键通过；证据以前缀 `search-review-` 单列。该接入同样仅在源码中，不属于原 `.1` 包验证；跨主机审阅及命中原文精确定位仍未实现。

纳入历史会话全文搜索及跨主机查询、`forflow search`、三类提供商的用量工作线程与 Codex 增量读取、原生聊天重连与计划展示、OpenCode 2、工作区基准引用选择、多行差异评论、折叠未修改区域、终端图片及交互设置，以及该发行版的移动端和底层更新。

冲突处理中保留 Forflow 的品牌、私有策略、中文 CLI、上下文预览、Analytics／Review、Jev 和原有自动化入口；复用上游统一用量归属函数和 CLI 子命令帮助，不保留重复实现。合并 PDF 资源插件与 Forflow 构建插件。保留 Forflow 的 smol-toml 1.6.1，并用 pnpm 11.19.0 修复合并后缺少该依赖快照的锁文件；其余变化为 pnpm 的 peer dependency 路由，未批量升级依赖。

补齐 178 个新中文键，移除已无英文来源的 67 个旧键，并校正提示。搜索默认关闭，需用户主动启用；未对真实历史建索引。中英文授权说明明确“索引留在主机，已认证配对客户端可以查询并取得结果”，修正上游“Nothing leaves that computer”的过度承诺。

## 已完成的验证

| 验证 | 结果与证据 |
| --- | --- |
| 中文及目录引用 | 15,710 / 15,710，无缺键；运行时目录 2,056 项通过。`localization.json`、`catalog.log`、`runtime-catalog.log` |
| 类型检查 | node、CLI、Web、mobile-web 四个项目通过。为控制本机资源，使用相同 tsconfig 顺序运行并限制 GOMAXPROCS=2；`typecheck-final.log` |
| 注册回归 | 首轮 304 文件 / 3,073 项，3,065 通过、8 失败；修正旧提示断言，资源压力消退后原聊天测试复验。3 个文件 / 69 项全部通过，未调整超时或断言标准。按最后一份完整文件结果去重，3,073 项当前均通过。`regression-initial.*`、`regression-retest.*`、`regression-reconciled.json` |
| 身份服务 | 11 项通过。`identity.log` |
| 冲突处理文件基础 lint | 15 个 TS/TSX 文件通过。`resolution-lint.log` |
| 构建 | relay、CLI、Electron main/preload/renderer、编译后技能 CLI、Web、mobile-web 和三类 macOS 原生助手通过。`build.log`、`package.log` |
| 包验证 | 签名严格检查通过；包内 daemon 可在 plain Node 加载；插件资源和移动网页清单校验通过；确认统计 worker、会话扫描器、产品元数据存在。`signature.log`、`package-contents.json` |
| 成品 CLI | `--version` 返回候选版本，`forflow search --help` 可执行，命令和说明品牌正确。`packaged-search-help.txt` |

首次并发类型检查记录了旧 CLI 测试接口不匹配，已修正；并发主进程／Web 编译因资源拥挤终止，最终改顺序执行并通过。首轮聊天恢复测试的超时与清理失败、旧搜索说明断言均保留，不能声称首轮全过。

## 尚未通过的发布条件

1. **整体增量质量门禁仍失败。** 以 Forflow 起点比较 3,427 个变更源码文件，共 64 项：基础规则 2、类型断言 30、类型感知 32；插件、React Doctor、设计系统和 SAFETY 说明检查均为 0。30 个涉及文件逐字节等同于 v1.4.206 上游版本，清单在 `quality-provenance.json`。其中移动端未安装独立 React Native 依赖，类型感知诊断需在该环境进一步核对。没有关闭规则、增加 max-lines 上限或把失败改成通过。完整暂存差异另有上游 patch 上下文空行及少量源码尾空格提示，见 `staged-whitespace-check.log`；未为消除提示而改写补丁。
2. **没有执行候选包的 Electron 窗口交互验收。** 项目 AGENTS 要求使用 `$electron` skill 和 Playwright CDP；当前技能目录与插件缓存未找到该 skill。已有 DOM 组件测试、成品 CLI、签名和包检查不替代安装包交互。没有使用 computer-use、前台窗口或真实账户数据绕过此要求。
3. 未进行 .25 → .206 的真实配置升级／回退、真实跨主机搜索、SSH 实机、其他 OS/CPU 或移动端实机验证。候选包不是可直接覆盖安装版的发布结论。

后续优先恢复项目指定的 Electron 验证能力，运行既有 `tests/playwright.forflow-packaged.config.ts`，补充搜索启用／停用／结果来源、统计 worker 与 Review 保留、聊天重连和旧配置升级。处理或正式记录上游质量门禁差异后再提交合并、按最终版本复验，安装仍应保护运行中的用户会话。
