# Forflow One 1.4.205-forflow.20 飞书连接提示修正版

2026-09-20，macOS arm64。用户在 `.19` 点击“连接本机飞书”看到笼统读取失败；本机实际诊断为官方 CLI 1.0.84 退出码 3、`config/not_configured`，尚未配置应用，并非已确认的网络或个人登录故障。

## 修复

- 按官方 CLI 稳定的 `error.type`／`error.subtype` 区分未配置应用、凭据无效、个人登录失效、应用未开权限、个人缺少权限、资源访问拒绝、网络、限流及安全策略。
- 不向界面转发原始 CLI message／hint，避免带出密钥；超限输出单独提示，未知错误保留可操作的终端排查入口。
- 复用已有 IPC 错误处理，设置和任务页去掉英文 `Error invoking remote method` 包装。
- 应用配置改为 `lark-cli config init`，允许选择复用已有应用；不再默认指向新建。指定 App ID 后，个人授权命令自动使用同一 profile；非法 ID 在提交前说明。
- 保持个人身份绑定、账号变化检查、只读任务接口和远程环境边界；没有自动授权、新建应用、机器人替代或回写操作。

用户已选择“复用已有自建应用”，并确认本机凭据已填好。2026-09-20 通过官方 CLI 标准输入完成已有应用配置；用户确认页面授权后，授权收尾退出码 0，个人身份为 ready，任务／任务清单读取及登录续期权限全部具备。没有新建应用或读取其他工具凭据，密钥及设备授权码未写入交付证据。

## 验证

源码提交：`9ce136fce6b91de443dd60a16be3d088b0826fd9`。

- 40 项飞书专项通过；218 个回归文件、2,119 项测试通过（比 `.19` 新增 22 项），身份服务 11 项通过。
- 全部类型、安装包测试类型、中文目录、代码质量、React 与设计系统检查通过。
- 最终安装包 12 个 smoke 场景通过，无跳过或重试。飞书专项先模拟真实 `not_configured`，点击连接看到中文第 2／3 步提示，无英文 IPC 包装和敏感原文；切到配置完成后重试绑定，再验证任务清单、分页、详情、草稿导入且未发送。
- 隐藏 Playwright CDP 截图检查通过。Browser 插件未提供，沿用项目安装包框架，始终设置 `ORCA_BACKGROUND_LAUNCH=1`；没有可见测试窗口或 Computer Use。

本机原始诊断见 `qa/forflow20-local-feishu-diagnosis.json`；错误界面截图 `qa/feishu-config-required.png`；候选测试结果 `qa/packaged-tests.json`。随后在安装版和用户实际配置中完成个人账号绑定，并成功读取 2 条未完成任务、2 个任务清单；回执仅保留数量、状态和时间，不记录任务正文或凭据。实际绑定文件仅保存应用 ID、个人 ID 和显示名。证据见 `qa/forflow20-feishu-personal-status.json`、`qa/forflow20-live-feishu.json`。

真实绑定检查首次等待默认窗口的桌面 API 超时；改为找到已就绪的桌面 API renderer 后重试成功，保留首轮失败回执。未修改应用代码或放宽测试。整个实际检查保持窗口隐藏、只读飞书；未发送消息、创建或修改任务。该账号的读取成功不代表其他租户或应用均已验收，真实模型调用仍未验证。

## 制品与安装

- 当前状态：用户确认已授权并退出应用后，于北京时间 2026-09-20 13:14 安装到 `/Applications/Forflow One.app`；安装后 12 个 smoke 场景全部通过，无跳过或重试。实际 CLI 返回 `.20`，9 份场景回执指纹与候选包一致。
- `.19` 回退位置：`/Users/zezhou/Library/Caches/Forflow One/rollback/1.4.205-forflow.19-before-forflow.20/Forflow One.app`。
- 安装回执 `qa/forflow20-installation.json`；安装后测试 `qa/installed/`。安装过程未改写用户数据，随后经授权写入实际飞书账号绑定。
- ZIP：`Forflow-One-1.4.205-forflow.20-mac-arm64.zip`
- ZIP SHA256：`8ddf9836d1389fec636be33d4a9a8aab8ae67d0e0e5d456bd72d7fd99f7579db`
- app.asar SHA256：`94594a30f3f2f1a5cf5dc8f0ae17b2b8c2f0fbe3a3ec215b74fa3b396672fef1`
- 严格签名、解压回读和源码指纹通过。仍为本机 ad-hoc 签名，未做 Apple 公证。

配置和恢复步骤见 [飞书操作说明](feishu-tasks.md)。分类依据为 [官方错误合同](https://github.com/larksuite/cli/blob/2d787fe5d6f35e279f39fe630328ad3689bf2aff/errs/ERROR_CONTRACT.md)，与本机版本匹配。
