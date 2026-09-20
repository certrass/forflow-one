# Forflow One 1.4.205-forflow.23

已安装到 `/Applications/Forflow One.app`。本版是 macOS arm64 本地测试版，采用本机临时签名，未公证。

## 本次调整

用户纠正 `.22` 页尾说明版后，将 Beta 融入「设置 → 统计和使用情况」的原界面：

- 原成本卡片可切换估算、已结算、套餐分摊、不可计量；币种位于口径选择旁，避免金额换行撑高卡片。
- 审计覆盖位于统计卡片与趋势之间，四个维度默认收起，逐项展开现有证据和缺口。
- 来源与范围按需查看，沿用提供商、工作区与时间筛选。空范围、缺价和读取失败分别显示实际状态。

当前只有日志估算与计量缺口；账单、套餐分摊和完整运行事件审计仍未接入。测试使用隔离配置及合成日志，没有调用真实付费模型或写入飞书任务。

## 验证

229 个回归文件、2,204 项测试及 11 项身份测试通过。最终候选包和安装版各 14 项 smoke 通过，无跳过或重试；每轮 11 份功能回执匹配同一 app.asar 指纹。

包含成本四种口径、证据默认收起与单项展开、真实本地日志扫描、混合缺价、时间／工作区过滤、空范围、键盘、浅色和窄屏深色。其余 smoke 覆盖品牌、CLI、八项入门、Codex GUI、任务入口、飞书夹具、文件和工作树、接续预检及原自动化页面。

首次专项测试因把现有“过去 7 天”菜单写成“最近 7 天”而失败，已按实际标签修复；原失败记录保留在 `.forflow/evidence/forflow23-usage-first`。布局检查另修复了成本币种换行和来源弹层滚动容器，随后以冻结源码重新构建并完成上述最终验证。首次候选及其测试记录保留，不冒充最终包证据。

## 制品与接续

- 源码提交：`1dd664e0f5117ea868755ba199ebce8fe6d80cbd`。
- app.asar SHA-256：`ae2967edb6264868eb2fd9188b0ca41250122e31290a13078af866d263b4246c`。
- ZIP SHA-256：`e8e5676865058272f62431f0f98964d973b6f4c026948a932359b8da9e2aaa55`。
- 发布目录：`/Users/zezhou/Documents/ChatGPT/Forflow One Releases/1.4.205-forflow.23`，包含 ZIP、`release.json` 和 `qa/`。
- 回退：`/Users/zezhou/Library/Caches/Forflow One/rollback/1.4.205-forflow.21-before-forflow.23/Forflow One.app`。
- 安装前检查旧版已退出；安装过程没有改写用户数据。`.22` 候选被本版替代，无需安装。

[浅色测试界面](../../.forflow/evidence/forflow23-installed/usage-integrated-light.png) · [展开模型审计](../../.forflow/evidence/forflow23-installed/usage-integrated-expanded.png) · [窄屏深色](../../.forflow/evidence/forflow23-installed/usage-integrated-dark-narrow.png) · [交互与数据口径](usage-audit-beta.md)
