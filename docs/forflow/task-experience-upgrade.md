# 任务体验与教程升级依据

2026-09-20。用户确认首批接「飞书任务／任务清单」，GUI 执行器仍优先 Codex；国内 AI CLI 新适配保持暂缓。

## 官方资料改变的判断

- [WorkBuddy 第一个任务](https://www.workbuddy.cn/docs/workbuddy/FirstTask)与[创建任务](https://www.workbuddy.cn/docs/workbuddy/Create-Task)：用自然语言目标、目录、材料和结果串起短流程。Forflow 快捷创建原先忽略传入 prompt，本版补上可编辑目标与草稿传递，而不是只增加教程文案。
- [WorkBuddy 连接器](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Connector)：连接管理与任务调用分开。Forflow 沿用「集成」设置和「任务」页面，添加飞书只读数据入口；连接并不等于已成功取到数据。
- [Codex 项目](https://learn.chatgpt.com/docs/projects)与[任务输入](https://learn.chatgpt.com/docs/prompting)：项目承载长期资料，任务聚焦一次结果；目标、参考资料、输出和约束组成可执行输入。本版把这四项写进入口提示，并保持每项工作独立的会话与工作区选择。
- WorkBuddy 的[远程助手](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Assistant)是消息交互入口；它与读取飞书任务库是两种功能。本版落实后者，未接消息机器人或企业微信。

来源实际通过官方页面正文、官方文档工具和 CLI 固定版本源码核对，原始研究材料保存在 `.forflow/research-task-ux/`。不是对其他产品的全功能审计。

## .16 的具体调整

任务来源按钮增加文字；任务页提供「从任务到结果」三步指引及连接入口。新建工作区提供任务说明，保留项目、位置、智能体和高级设置；Git 工作树和普通文件夹都复用原创建链路。说明进入草稿，不静默自动执行。

飞书提供首次连接指引、个人身份绑定、我的任务、清单筛选、完成状态、显式读取、分页、已加载结果搜索、详情、来源打开与导入预览。读取错误保留恢复指引；变更账号、断开或切换运行环境后丢弃过期结果。

完整八项入门、Jira／Linear／GitHub／GitLab 来源、既有模型账户和专业终端能力继续保留。后续若接多维表格，应另做字段映射与对象模型，不能把它伪装成飞书任务 API。
