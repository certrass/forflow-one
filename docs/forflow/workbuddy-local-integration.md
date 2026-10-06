# WorkBuddy 本地接入核对

核对日期：2026-10-06。用户要求像使用 Codex 一样，在 Forflow One 内选择 WorkBuddy、发送任务并查看回复，并明确优先研究内置 CLI 和本地文件方案。

## 本机实测

- WorkBuddy 桌面版本为 `5.5.6`；安装包内含 `Contents/Resources/app.asar.unpacked/cli/bin/codebuddy`，对应 CLI `2.137.1`。该路径下的 `product.json` 声明 `productName: WorkBuddy`、`authentication.id: workbuddy-desktop`，不能仅凭可执行文件名把它当成独立 CodeBuddy 产品。
- CLI 可独立执行 `--version`、`--help`。支持 `--acp`、流式输入输出、`--resume`、`--session-id` 和默认权限模式。
- ACP `initialize` 实测成功，协议版本为 1；返回 `loadSession: true`，以及微信、海外、iOA 和企业域登录方法。
- 首次调用 `session/new` 返回 `-32000 / Authentication required`。用户完成 WorkBuddy 登录后，厂商 CLI 自行读取其 `workbuddy-desktop` 认证，重新创建会话成功。
- 在空白项目、隔离配置、无工具与空 MCP 配置中完成真实两轮对话：先返回连接测试标记，再经 `session/load` 恢复后正确返回前轮标记。两轮均以 `end_turn` 结束，权限请求为 0，探测进程已关闭。后续以 Forflow 内置桥接 CLI 完成了跨进程恢复：新进程加载原会话，在新增回复中正确回忆首轮标记。
- 本机存在 `~/.workbuddy` 及旧桌面会话数据库 `~/Library/Application Support/WorkBuddy/codebuddy-sessions.vscdb`。只核对目录、表结构及条目数量，没有修改已有会话。本轮已确认当前厂商登录可供内置 CLI 使用；没有迁移、解密或复制旧凭据。

探测脚本和实际响应：`.forflow/evidence/workbuddy-local-20261006/probe.py`、`protocol-result.json`、`roundtrip.py`、`roundtrip-result.json`。证据目录不提交到 Git。

## 接入方向

采用本机安装包内的 WorkBuddy CLI，通过 ACP 创建会话、发送消息、处理权限请求和接收回复；本地会话文件用于读取历史和定位恢复对象。沿用厂商认证流程，Forflow 不复制或解密旧桌面的登录凭据。安装包内程序及产品配置不复制进 Forflow 的分发包。

`.5` 已接入现有智能体选择、任务标签和原生聊天，CLI 以工作区目录启动；跨进程恢复已通过真实账号验证。权限选项和停止操作由成品模拟 ACP 测试检查，实际工具执行不属于该模拟测试的结论。路径发现和启动必须在执行主机上完成，不将本机的 WorkBuddy 安装状态用于 SSH、WSL 或其他服务器。

此路线不以开放平台应用注册为前置条件。前一轮将 Open API 注册视为必经步骤的判断已被本机 CLI 证据修正；本机登录和两轮收发已验证。用户随后要求优先接入飞书里的 aily，并统一两个伙伴与 Codex／Claude 的使用入口。当前实现与安装验收见 [伙伴接入说明](aily-integration.md)。

官方协议参考：[ACP 协议集成](https://www.codebuddy.cn/docs/cli/acp)。最新文档的新增能力不能代替本机 `2.137.1` 的能力协商结果。
