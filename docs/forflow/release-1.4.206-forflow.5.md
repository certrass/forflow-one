# Forflow One 1.4.206-forflow.5 原生审阅引导

2026-09-23，macOS arm64；已安装至 `/Applications/Forflow One.app`。运行时代码 `6bbc5c7a639feb5f0ab98b825f6f2b7de23296b7`。

## 用户反馈与最终行为

用户指出原表单仍然复杂，明确要求“教我一步步操作”，并选择指向操作位置的引导气泡；同时纠正新气泡没有沿用 Orca 原有样式。本版用实际分步交互替代原长表单：选项目、填写目标、勾选材料，每次只显示当前步骤。目标可从三个示例开始，再改成实际要求；返回上一步保留输入，编辑已保存审阅直接进入材料步骤。

审阅与 Orca 原教程现在共用 `ContextualTourCallout`，统一原有面板、箭头、排版、关闭按钮和定位机制。气泡先指向当前输入，完成选择后指向继续按钮并解释下一步；页面与气泡共用三步进度。进入审阅后继续说明查看原文、标记问题、填写依据、Jev 选材和发送预览、修改后的版本复评。保留最多 40 个本机材料与 Jev 每次 1–12 个来源的区别，教学按钮只导航，不自动读取原文、保存问题、调用 Jev 或确认验收。

输入不关闭气泡，下拉菜单优先消费 Esc；气泡可关闭和重开。切到其他页签暂停气泡与键盘监听，并保留关闭状态；原全局教程出现时本地引导暂停。项目身份变化、异步回包、旧版本及重复提交继续沿用原保护。每日强度、Token 分布、对话审阅和原 Jev 发送流程保留。本轮真实 Jev 请求为 0。

## 验证

- 完整类型检查、本地化 15,953 个中英文键、11 项身份服务检查通过；**336 文件／3,478 项项目回归通过**。
- 21 个 JS/TS 文件的六类增量质量扫描与 SAFETY 检查通过；提交 hook 通过，25 个源码／配置文件提交后哈希与成品清单一致。
- **9 项候选成品场景通过**：原有操作指引、新旧 Jev、Analytics 与原图表、项目／普通文件夹审阅、中文启动、编辑／差异、CLI 和重启。
- **4 项安装后复验通过**：中文启动、CLI、项目工作区操作与重启、项目审阅全过程。均无跳过、失败或重试。
- Playwright Electron/CDP 隔离配置、全程 `ORCA_BACKGROUND_LAUNCH=1`。宽 1500 与窄 1000 的截图已检查；箭头可见，目标输入、三个示例与主按钮不被遮挡，页签与气泡正常联动，无页面脚本错误。Browser plugin 未提供，遵循项目限制使用 Playwright，未使用 computer-use 或前台激活。
- 初版普通 Popover 虽通过操作测试，视觉检查发现箭头裁切、锚点过大和遮挡，已改为共用原生组件。随后发现目标气泡遮住第三个示例，改为锚定整组输入并增加三个按钮不相交断言。截图测试曾把尚在定位的打开气泡误判为关闭，已改查 `aria-expanded`。初次类型错误、旧截图和失败日志保留，没有用其作为当前通过证据。
- 严格签名通过；ZIP 解压包、候选包、安装目录 ASAR 相同。旧 `.4` 保留回退；安装器不改写用户配置或凭据。全部验证实例已退出，不留下隐藏进程接管打开请求。

## 交付与证据

ASAR SHA-256：`c0ac9be4c8157bb4c50df0f66066e4530c20b3f6822dfc7bd41b59fa9915b131`。

ZIP SHA-256：`3acbed552bf737551b27fc5bba71a4ef0051c08fd2736ba9c8b2dcbd459fb0d5`。

包：`/Users/zezhou/Library/Caches/Forflow One/builds/1.4.206-forflow.5/Forflow-One-1.4.206-forflow.5-arm64.zip`。

回退：`/Users/zezhou/Library/Caches/Forflow One/rollback/1.4.206-forflow.4-before-1.4.206-forflow.5/Forflow One.app`。

证据根目录：`/Users/zezhou/Library/Caches/Forflow One/builds/1.4.206-forflow.5/qa`。`package-check.json`、`commit-source-check.json` 绑定源码与成品；`regression-tests.json` 是项目回归；`packaged/`、`installed/` 包含成品报告、流程回执和截图；`../DELIVERY.json` 汇总安装、哈希与退出状态。最终图为 `project-review-guide-step-1-choose.png`、`project-review-guide-step-2-choose.png`、`project-review-guide-narrow.png`、`project-review-read-source-guide.png`。旧图位于带 `first-layout`、`native-before-preset-fix` 后缀目录与 `guide-layout/`，不能替代最终截图。应用包与截图不提交源码仓库。

本版本是本地 ad-hoc 签名测试版，未公证；未在 Windows、Linux、SSH 实机验证。原整合差异的 64 项上游质量基线未在本轮清除，增量通过不代表整段门禁通过。原 Jev 质量评测边界不变。
