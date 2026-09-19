# 数据链、证据链和治理接口合同（设计）

本文件是下一工作包的设计输入；本轮没有实现企业网关、证据服务或多用户授权。

## 同一次运行的事实主线

```mermaid
flowchart LR
  A[用户/项目/目的] --> B[服务端授权决定]
  B --> C[输入版本与数据快照]
  C --> D[规则版本/模型/执行器]
  D --> E[工具动作与执行主机回执]
  E --> F[产物哈希/评估与反证]
  F --> G[复核/批准指定版本]
  G --> H[发布或归档/整改复测]
  E --> I[独立审计存储]
  H --> I
```

把业务结论证据与安全履责记录分开存放、用同一 run_id 关联。数据来源可追溯并不证明取数获得授权；权限检查成功也不证明业务结论正确。

## 12 个数据阶段

| 阶段 | 记录与控制 | 失败时的表现 |
| --- | --- | --- |
| 1 身份与目的 | actor、tenant、project、purpose、会话/服务身份；服务端校验 | 不把客户端传入 tenant 当授权依据 |
| 2 源登记 | source ID、owner、来源合同、分类分级、可用处理目的 | 来源不明转待确认，不进入正式结论 |
| 3 授权决定 | subject/resource/action/context、policy version、有效期 | 明确拒绝，不只隐藏按钮 |
| 4 提取 | adapter/version、SQL/参数摘要、行列范围、快照时间 | 无权读取不落缓存；只读账户与查询限制实际生效 |
| 5 清洗/脱敏 | 输入/输出 hash、转换规则、字段映射、去标识策略 | 保留变换关系；原始敏感内容隔离存储 |
| 6 切片/索引 | chunk ID、源页/行定位、parser版本、embedding配置、ACL | 检索与原文打开都重新鉴权，防向量索引跨项目串用 |
| 7 检索/上下文 | 候选来源、选用范围、截断、prompt模板版本、token预算 | 没找到依据显示缺失；不把召回排名当可信度 |
| 8 模型请求 | provider、region、endpoint ID、model/revision、参数、credential ref | 不记录密钥；失败不自动换到未授权域或模型 |
| 9 工具动作 | action/target/intent、policy decision、approval ref、attempt、执行主机receipt | 变更有幂等键；非幂等动作重试前核验已执行状态 |
| 10 产物/评估 | 文件 hash、版本、测试退出码、评估器版本、Claim及反证 | 模型叙述与工具事实冲突时保留冲突 |
| 11 复核/发布 | reviewer、scope、artifact hash、决定、期限、目标系统结果 | 产物更新使旧批准失效；发布失败不能标已完成 |
| 12 保留/删除/恢复 | 类别化保留策略、加密、导出记录、删除/保全、备份恢复receipt | 同时处理索引、缓存、副本；保留可解释的墓碑记录 |

## 企业运行适配层

推荐部署为独立服务，桌面只作客户端。先支持 `CreateRun / GetRun / CancelRun / ListArtifacts / StreamEvents`，再加入写操作。每个方法有 input schema、授权范围、幂等规则、错误码和支持版本。

必须统一的关联字段：`tenant_id, project_id, actor_id, run_id, task_id, attempt_id, runtime_id, runtime_epoch, event_id, event_sequence, correlation_id`。源数据额外保留 `source_id, snapshot_id, content_hash, classification, acl_version`；策略/模型/产物都使用显式版本。

事件最小结构建议如下，**不是已经落地的 API**：

```json
{
  "schema_version": "forflow.execution-event.v1",
  "event_id": "uuid",
  "run_id": "uuid",
  "attempt_id": "uuid",
  "actor_ref": "enterprise-user-id",
  "runtime_ref": "worker-id+epoch",
  "sequence": 12,
  "kind": "tool.result",
  "resource_ref": "project/source/version",
  "policy_decision_ref": "decision-id",
  "payload_digest": "sha256:...",
  "payload_ref": "encrypted-evidence-object-id",
  "source_time": "RFC3339",
  "received_time": "RFC3339",
  "result": "succeeded"
}
```

采用事务 outbox 避免“业务执行了但审计事件没写”；消费者使用 event_id 去重、sequence 检查缺口，并对 out-of-order 和未知状态单独处理。签名批次放在权限独立的存储；仅把 hash 存进同一 SQLite 不能证明未被管理员重写。

数据权限代理执行源端行列授权，worker 使用短期受限凭据。默认通用 shell 能读取宿主文件与网络，所以仅在工具函数前加鉴权不足以成立边界：必须在 OS／容器或 VM、挂载点、服务身份与出站层落实限制。

## 九个模块如何映射

| 用户模块 | 权威实体与来源 | 与 Orca 的接点 | 首个可用验收 |
| --- | --- | --- | --- |
| 内容知识与规则 | SourceSnapshot、KnowledgeVersion、RuleSetVersion | 任务上下文装配、受控 MCP/检索 | 每段来源定位可打开且重新鉴权，运行固定规则版本 |
| AI 资产 | AssetVersion、Owner、License、Review、RuntimeCompatibility | 插件/Skill/模板/模型配置与产物 | 资产安装与调用有签名和版本；撤销后不能新启动 |
| 治理概览 | 同一事件库的统计视图 | run、task、失败/拒绝/整改状态 | 数字可下钻到事件，统计时间窗口和分母明确 |
| 数据目录 | Dataset、Field、Classification、ACL、Lineage | 连接器、数据授权代理 | 目录可见与数据可读权限分别验证 |
| 业务对象 | ObjectType、ObjectVersion、Relationship、MetricDefinition | 业务任务与证据关系 | 对象ID贯通源数据、指标、结论，不靠文案名字拼接 |
| 业务符合 | Requirement、Claim、Evidence、ReviewDecision | Q2Q评审 adapter | 支持/反证/缺失分别展示；“业务符合”名称按用户原文，是否对应原型“业务复核”待核对 |
| 结构评估 | Schema/RelationshipCheck、EvaluatorVersion、Finding | 数据/知识结构和规则版本 | 失败能定位对象和规则，变更后可复测 |
| AI 用量 | UsageRecord、provider计量、成本口径、project/run归属 | 执行器用量事件和网关 | 区分实测/估计；重试、缓存、隐藏调用能核对账单 |
| 数据浏览 | QuerySession、QueryPolicyDecision、ExportReceipt | 受控查询和预览 | 行列脱敏、分页/导出限制均在服务端生效 |

Q2Q 当前本机工程 commit 为 `14373a175e4466dbede4ebcfd07806005141214f`。`q2q_project_service.py / assessment / repository` 为项目生命周期，`q2q_claim_judgment.py` 为 Claim 内核，workspace application service 为消费入口。其当前 README 明确多用户身份与客户签章未接入。因此复用判断机制，同时补企业身份和证据合同；旧工程的某项本机验证不继承为 Forflow 的验证结论。

## 176 号令对应的建设边界

官方文本为《公安机关网络空间安全监督检查办法》，2026-10-01 施行。第 7 条列重点检查义务，第 8 条涉及特定任务专项检查，第 12、15、16 条分别涉及检查措施、记录和整改；第 20 条涉及检查材料保密与用途。第 14 条不允许指定购买产品。适用对象与义务应结合客户身份、数据与服务方式确认。它不是“装上 Forflow 即取得认证”的标准。[官方原文](https://gaj.linxia.gov.cn/gaj/gaxw/gsgg/art/2026/art_5f125ac64d52498d9a50ffe4f2407bd5.html)

以下是我们的工程落实建议，不声称办法逐字要求这些技术实现：

| 控制建议 | 需要提供的证据 | 谁负责／当前状态 |
| --- | --- | --- |
| C01 适用范围与责任人 | 客户系统/资产/数据边界、适用性判断、职责与制度版本 | 客户负责管理事实；平台登记；未接入 |
| C02 身份与最小权限 | 授权策略、拒绝事件、撤权测试、服务账户用途 | 平台+客户身份系统；待开发 |
| C03 日志分类保留 | 期限依据、访问记录、缺口检测、恢复演练 | 平台+客户安全运维；现有诊断轮转不足 |
| C04 数据/个人信息处理 | 来源与目的、分类分级、最小化、脱敏、导出/删除记录 | 客户定义适用义务，平台执行；待开发 |
| C05 攻击/漏洞处理 | 制品清单、扫描报告、补丁/回归、告警和处置闭环 | 平台+客户安全团队；仅本轮源盘点 |
| C06 等保/关基相关事项 | 适用时的定级、测评、整改及管理资料 | 客户及适用专业机构；软件不能代办完成声明 |
| C07 公共信息/算法相关事项 | 适用场景的审核、规则和抽测记录 | 按实际服务方式确认，不一概套在内部工具 |
| C08 应急与事件处置 | 预案、联系人、演练、事件时间线与报告材料 | 客户+运维；待接入 |
| C09 检查支持与材料导出 | 限范围的材料包、版本/哈希、访问与交付记录 | 平台提供辅助，不代签法定检查记录 |
| C10 整改复测 | finding→责任人→变更→测试→复核→关闭 | 平台+客户；设计已列，未实现 |

界面应显示“已配置 / 已执行 / 已验证 / 有缺口 / 不适用及理由”，不要给整个平台一个无依据的“符合176号令”绿灯。法定期限、备案、测评及行业要求由后续适用性核验确定，不从默认日志大小推导。
