# 首轮源码验证存档

以下记录首轮源码改造时的验证状态；历史交付见 [1.4.205-forflow.1](release-1.4.205-forflow.1.md) 和 [1.4.205-forflow.2](release-1.4.205-forflow.2.md)；当前清单修复、权限与上传、本机安装见 [1.4.205-forflow.3](release-1.4.205-forflow.3.md)。保留原回执，不用后续结果改写历史。

基线 `11aba8bdc5e492d3ba01fc7fe333495ace74128f`，工作分支 `codex/forflow-cn-v1.4.205`。改动尚未提交或推送。最终文件指纹位于 `.forflow/evidence/worktree-manifest.json`，验证摘要位于 `.forflow/evidence/validation.json`；均只记录文件哈希和结果，不包含模型凭据。

## 验证对象与环境

本次验证的是源代码改造和本机开发构建，使用 macOS Apple Silicon、Node 24.14.0、pnpm 11.19.0、Electron 43.7.0。原安装 `/Applications/Orca.app` 1.4.205 保留。依赖按原 `pnpm-lock.yaml` 冻结安装，未换锁文件；发布仍需按上游声明的 pnpm 12.0.0 复验。

## 执行记录

| 检查                      | 实际结果                                                                        | 回执                                                           |
| ------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 冻结依赖安装              | 通过；第一次网络超时后增加单次等待并降低并发，重试完成                          | `.forflow/dependency-install.log`                              |
| 针对性单元测试            | 21 个文件、256 项通过；包括品牌大小写、首次引导和自动回退修正后的完整针对性复验 | `.forflow/unit-tests.log`、`.forflow/evidence/unit-tests.json` |
| 类型检查                  | node / CLI / renderer 项目通过                                                  | `.forflow/typecheck.log`                                       |
| 改动源文件 lint           | 52 个文件检查通过；未跑全仓 lint                                                | `.forflow/lint.log`                                            |
| 桌面增量构建              | 通过；仍有上游大分块警告                                                        | `.forflow/build.log`                                           |
| 完整 `pnpm build:forflow` | 通过：类型检查、relay、CLI、桌面、内置 Skills CLI 完整性及 Web 投影             | `.forflow/full-build.log`                                      |
| 隐藏 Electron 首次启动    | 1 项通过；中文、品牌、国内 CLI、权限默认值及禁止自动回退                        | `.forflow/e2e.log`、`.forflow/evidence/startup.json`           |
| 真实国内 API              | 用户决定稍后配置，未运行；缺配置行为和响应合同使用模拟测试                      | `.forflow/evidence/model-probe.json`                           |
| 仓库改动完整性            | 最终 `git diff --check` 与文件指纹见 JSON 摘要                                  | `.forflow/evidence/worktree-manifest.json`                     |

单元测试覆盖品牌与用户插值分离、私有策略与非法配置、云功能拒绝路径、遥测优先级、自动及手动升级阻止、国内 CLI 命令识别、初始提示词跨平台引号、一次性与交互进程区分、国内候选顺序、i18n 加载，以及模型探针的端点限制与不输出密钥。

首次启动测试使用仓库现有隔离 HOME／userData 的 Electron fixture，全程 `ORCA_BACKGROUND_LAUNCH=1`，核对中文、Forflow 产品名、新工作区目录、分享／手机入口关闭、默认保留权限检查、国内 CLI 菜单以及无 Google favicon 回退；同时断言可见窗口数为 0，首次引导不会自动选中 Codex。一次复验因误用了普通构建、缺少测试专用 store 暴露标记而在 fixture 失败，另一次断言遗漏按钮名中显示的 CLI 命令，已按实际可访问名称修正。最终按 `--mode e2e` 重新构建后验收，不放宽等待或跳过断言。

## 尚未验证的层

- CodeBuddy / Qoder CN / TRAE CN 的真实安装、国内认证、读写任务、取消恢复和结构化事件；本轮只验证工作台内启动适配。
- 模型流式、工具调用、长上下文、计费对账与多模态。
- 客户 Linux/Windows/国产 OS、CPU、SSH worker 和完整出站阻断。
- 中文 IME、全量翻译质量、正式图标、安装器／签名／并存／升级回滚。
- 企业身份、数据授权、独立审计证据库及治理模块；方案和验收合同已列，未实现为生产能力。

## 复验入口

```sh
pnpm build:forflow
pnpm audit:forflow
FORFLOW_BUILD=1 VITE_EXPOSE_STORE=true pnpm run build:electron-vite --mode e2e
SKIP_BUILD=1 ORCA_BACKGROUND_LAUNCH=1 pnpm exec playwright test tests/e2e/forflow-private-startup.spec.ts --config tests/playwright.config.ts --project electron-headless --workers=1
```

E2E 构建仅用于开发验证；准备交付时重新运行正常构建并完成独立安装包验收，不能把测试输出目录当成已批准制品。真实模型联调在用户配置本机环境后执行，密钥不写进命令、报告或 Git。

## 2026-09-19：1.4.205-forflow.2 安装版验证

当前版本已安装到 `/Applications/Forflow One.app`。本轮以正常生产构建的 macOS arm64 安装包为对象，完成 40 个文件的 459 项单元回归、11 项真实身份服务接口测试，以及安装前、安装后各 3 条 smoke／端到端回归。类型检查、改动文件 lint 与代码质量门禁均通过。中文目录共 14,390 项，无缺失和插值错误；509 项技术原文按键和值逐项列入保留清单。上述目录覆盖率不等同于中文 IME 或逐屏人工校对结果。

安装包流程实际覆盖中文冷启动、本地 Git 工作区与终端、文件修改和差异、深色模式、重启恢复，以及自有账号登录、停用与会话撤销、密码重置、身份审计、断网处理和上游服务阻断。测试窗口全程隐藏。真实用户配置也通过已安装应用的接口预填了 `http://127.0.0.1:43120`；本机账号服务仅监听回环地址，初始账号的登录／退出已验证，密码未进入测试报告或安装包。

交付目录为 `/Users/zezhou/Documents/ChatGPT/Forflow One Releases/1.4.205-forflow.2/`，最终验收以其中 `release.json`、`SHA256SUMS.txt` 和 `qa/` 为准；源码构建快照与验收快照分别保存，运行时代码未在构建后改动。本轮固定使用 Node 24.14.0、pnpm 11.19.0，不再沿用首轮记录中尚待复验的 pnpm 12 假设。SSO、业务数据权限、Agent 行为审计、真实国内模型调用及其他平台安装包仍需独立验收。

## 2026-09-19：1.4.205-forflow.3 清单与传输验收

`.3` 已替换本机 Forflow 应用，`.2` 应用文件保留为回退副本。65 个测试文件的 702 项回归及 11 项身份服务测试通过；正常生产包和安装后各 6 条 smoke/端到端流程通过。清单实际包含原 8 项，未完成项不会预置完成；添加两个真实 Git 项目后，对应进度变更并在重载后保留。原并行任务浮层已按真实渲染验证中文，内置技能安装写入隔离 HOME，未操作用户现有技能。

网站上传实测取消后接收 0 字节，允许后接收 32,795 字节且内容完全一致；通知权限经过拒绝、允许、刷新后重新确认。辅助功能和截屏状态检查成功，均为尚未授予，未请求或开启系统授权。本机身份服务的 5 个运行文件与已测试源码逐一匹配，服务健康接口正常；桌面配置仍指向 `127.0.0.1:43120`，本轮未读取账号密码。

证据保存于 `.forflow/evidence/private-v3-*`，交付副本在 `Forflow One Releases/1.4.205-forflow.3/qa/`；以同目录 `release.json` 的制品哈希、源码指纹和验证记录关联版本。生产类型检查、Forflow 安装包测试类型检查、中文目录/运行时目录、改动代码质量通过。上游全量 E2E 类型检查的失败尝试保留为独立日志，没有标记通过；本次没有运行上游全量测试或真实 SSH 主机联调。

`.2` 目录完整性校验没有覆盖硬编码浮层，也未发现清单被替换，不能用它证明逐屏汉化或功能保留。本次已据用户反馈恢复原清单，并补真实交互、完成进度、离线安装、浮层及文件接收端验证。应用内确认的覆盖范围和后续业务权限/独立审计工作见 [本版说明](release-1.4.205-forflow.3.md)。
