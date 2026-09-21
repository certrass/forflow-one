# 审计治理：让判断随依据变化而复评

2026-09-22。用户提供 Databricks 文章，要求据治理逻辑优化现有审计。本文区分外部依据、Forflow 设计推导及本轮实际代码修改。交付质量为主、合规独立保留；仍使用对话／研发工作区入口和既有统计页。

## 外部依据改变了什么判断

文章把业务定义、上下文和关系纳入治理，主张执行过程留下证据，并在依据变化后重新检查。对 Forflow 的启发是：审计不仅保存一次结果，还要知道结果适用于什么对象、依赖哪些材料和判断口径。这里采用其治理机制，不引入整套 lakehouse 或照搬组织审批阶段。[原文，2026-09-03](https://www.databricks.com/blog/governance-beyond-security-knowledge-context-ontology-lakehouse)

原文部分表述需要与实际产品能力分开：

- **权限不能靠标签推断已贯通。** 2026-09-18 官方 ABAC 文档说明，源表的 ABAC 不应用于从该表创建的 AI Search 索引，索引同步所有行，查询时不执行相应行过滤／列掩码。Forflow 后续检索、原文预览、模型外发应分别核对授权，不能因来源已有权限标记就认为派生内容安全。[官方限制](https://docs.databricks.com/aws/en/data-governance/unity-catalog/abac/requirements)
- **认证失效需要明确实现。** 平台认证是 `system.certification_status` 标签；自动打标 Beta 按配置条件和周期运行，结果通常在 24 小时内，尚不支持事件调度。文章里的即时持续认证属于方案机制，不能视为通用开箱保证。[认证标签](https://docs.databricks.com/aws/en/data-governance/unity-catalog/certify-deprecate-data)、[自动打标](https://docs.databricks.com/aws/en/admin/governed-tags/automate-tag-assignment)
- **定义要被执行引用。** Metric Views 将指标定义为可复用的运行时计算口径。Forflow 对应的是让问题生成、结果展示和复评引用同一版要求；仅增加一个术语说明栏还不够。[Metric Views](https://docs.databricks.com/aws/en/uc-semantics/metric-views)

“更便宜模型保持同等准确率”仍需本项目实验；不作为 Jev 中文判断质量或成本效果的既定结论。

## Forflow 的具体治理逻辑

以下是结合当前实现的设计，不是 Databricks 原文给出的 Forflow 功能。

| 需要治理的内容 | 应保存的关系 | 对审阅者的实际用处 |
| --- | --- | --- |
| 对象与用途 | 对话／项目 ID、执行主机、交付项、使用场景、版本与时间范围 | 不拿别的项目、旧周期或测试环境的材料证明当前交付 |
| 判定口径 | 要求原文、来源、适用条件、术语、必需证据、问题集版本 | 知道“满足”具体指什么；没有标准时仍能审阅，但标为待明确 |
| 证据关系 | 要求到材料、原文位置、角色、内容指纹、支持／反证／缺失 | 制度文件、落实记录、助手自述分开；材料多不等于覆盖完整 |
| 判断与时效 | 结果、依据版本、模型分布、人工处置、失效原因 | 来源或口径改变后，仅复评受影响事项，历史仍能回看 |
| 修复与复验 | 问题 → 修复版本 → 回答原问题的重测 → 人工处置 | 新增成功材料或删除失败材料不会自动消除反证 |
| 用户纠正 | 原判断、新判断、原因、对象／版本、适用范围 | 将定义错误、对象错配、缺证和模型误判分别转成回归样本 |

例如企业制度要求“权限变更后进行独立复核”：制度正文只能支持“已经规定”；当前对象、周期内的变更记录及独立复核回执才支持“已经落实”。回执来自另一个项目时是对象不匹配，不应被高置信度分类补成合格。这是合成制度例子，不作为法规条文。

分工沿用现有设计：程序核对来源、哈希、身份、时点和版本；Jev 对限定问题给出语义候选和概率；Q2Q 接收经过核对的关系，保留缺失、冲突和明确复验；Review 承接定位原文、处置、评论与人工确认。Jev 的高置信度不自动变成人工确认，Q2Q 的最后一条成功测量也不自动覆盖反证。

页面继续采用 PR 式结构：Description 放目标和范围；Checks 按要求展示结论、依据和缺口；Activity 保留问题、处理、材料变更、复评和确认。主状态继续分开“可开始审阅”和“验收证据支持程度”；不用一个合规百分比或总分抵消必需项失败。既有入口与数据边界见 [Analytics／Review Beta](analytics-review-beta.md)。

## 本轮已实现

### 相关证据变化时重新打开已关闭问题

原缺陷：问题在第一版被标记为已解决／已忽略后，重新读取会追加版本，但旧关闭状态一直沿用；即使对应代码或工具返回已改变，确认新版本仍可通过。

现在 `CodexReviewStore.open()` 根据每个问题的 `resolvedInVersion` 查找作出决定时的证据：

- 会话记录复用版本比较的内容及配对结果指纹；工作区使用文件身份、角色、读取状态、内容哈希和根目录身份。
- 相关内容、返回值改变，证据移除、不可读或历史指纹无法核验时，问题重新打开，记录复评活动。确认仍由既有未处理问题检查阻挡。
- 无关材料变化、只有文件时间变化且内容可核验一致，不重新打开该问题。
- 原关闭评论和历史确认保留；重新处置后可确认当前版本。相同快照反复读取不会重复活动。
- 对已经被旧逻辑带到当前版本的关闭决定，重新打开相同快照也会修正；不要求人为再改文件。
- 从已保存审阅直接确认时同样核对处理依据；发现失效便阻止确认并提示重新读取，不写入一次错误确认或隐式变更调用方的 revision。

实现复用当前问题和活动结构，没有新增迁移格式或远端协议。本轮只覆盖明确关联 `evidenceKey` 的依赖；范围级问题、要求／政策适用条件变更尚未具备逐项依赖关系。未新增后台文件监控，触发点是重新读取／打开审阅；确认前的来源重读保护继续保留。

### Jev 检查绑定问题集版本

原缺陷：检查摘要仅按材料版本统计，旧问题集结果会混入当前完成数；采纳入口也未核对问题集版本。

现在摘要同时匹配材料版本和当前问题版本，后端拒绝采纳旧版及未知版本建议。历史回包、活动和已采纳问题保留，不回写旧结果。本轮未调整结果卡片布局；历史建议的采纳按钮仍会出现，点击后返回明确的版本变化提示。

## 验证及交付边界

新增用例先在原实现复现失败：证据失效 6 项失败，Jev 问题版本 3 项失败。独立复审另外复现旧账本不经过重新读取、直接确认的旁路，并修复。最终会话、工作区、Jev 与检查摘要等 8 文件／84 项定向回归通过；结果与本轮源码指纹保存在 `.forflow/evidence/review-governance-20260922/proof.json`。主进程／网页类型及本轮 9 文件六类质量检查通过，回执另存同目录。

可复跑：

```sh
ORCA_BACKGROUND_LAUNCH=1 pnpm test src/main/codex-usage/codex-review.test.ts src/main/codex-usage/codex-review-evidence.test.ts src/main/review/workspace-review-store.test.ts src/main/review/workspace-jev-audit.test.ts src/main/forflow/jev-audit-service.test.ts src/main/ipc/jev-audit-handlers.test.ts src/renderer/src/components/stats/codex-review-activity.test.ts src/renderer/src/components/stats/use-jev-review-checks.test.ts
ORCA_BACKGROUND_LAUNCH=1 pnpm tc:node
ORCA_BACKGROUND_LAUNCH=1 pnpm tc:web
```

本轮没有真实 Jev 请求，未消耗授权模型测试预算；也未重新打包或安装应用。完整要求包、Choice／Score／Noul 扩展、Q2Q 运行时接入与行业语义评测仍按各自设计和回执推进，不用这次确定性回归替代它们。

后续最小增量是研发工作区中一个交付项的“要求—证据”绑定和两轴结果。扩展规则版本时应保留旧账本可读；当前工作区 schema 固定为 `workspace-evidence-v1`，不能直接更改 literal 而不处理历史兼容。验收应覆盖：错误对象、旧周期、相反证据调序、要求变化、反证删除、修复后明确复验，以及中文模糊要求的人工分歧。
