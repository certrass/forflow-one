# Forflow One 1.4.205-forflow.20 飞书连接提示修正版

2026-09-20，macOS arm64。用户在 `.19` 点击“连接本机飞书”看到笼统读取失败；本机实际诊断为官方 CLI 1.0.84 退出码 3、`config/not_configured`，尚未配置应用，并非已确认的网络或个人登录故障。

## 修复

- 按官方 CLI 稳定的 `error.type`／`error.subtype` 区分未配置应用、凭据无效、个人登录失效、应用未开权限、个人缺少权限、资源访问拒绝、网络、限流及安全策略。
- 不向界面转发原始 CLI message／hint，避免带出密钥；超限输出单独提示，未知错误保留可操作的终端排查入口。
- 复用已有 IPC 错误处理，设置和任务页去掉英文 `Error invoking remote method` 包装。
- 应用配置改为 `lark-cli config init`，允许选择复用已有应用；不再默认指向新建。指定 App ID 后，个人授权命令自动使用同一 profile；非法 ID 在提交前说明。
- 保持个人身份绑定、账号变化检查、只读任务接口和远程环境边界；没有自动授权、新建应用、机器人替代或回写操作。

用户已选择“复用已有自建应用”。本机凭据输入文件已限制为当前用户读写、排除 Git；尚未收到填写完成的回复，不读取或猜测其他应用凭据，也未执行实际个人授权。

## 验证

源码提交：`9ce136fce6b91de443dd60a16be3d088b0826fd9`。

- 40 项飞书专项通过；218 个回归文件、2,119 项测试通过（比 `.19` 新增 22 项），身份服务 11 项通过。
- 全部类型、安装包测试类型、中文目录、代码质量、React 与设计系统检查通过。
- 最终安装包 12 个 smoke 场景通过，无跳过或重试。飞书专项先模拟真实 `not_configured`，点击连接看到中文第 2／3 步提示，无英文 IPC 包装和敏感原文；切到配置完成后重试绑定，再验证任务清单、分页、详情、草稿导入且未发送。
- 隐藏 Playwright CDP 截图检查通过。Browser 插件未提供，沿用项目安装包框架，始终设置 `ORCA_BACKGROUND_LAUNCH=1`；没有可见测试窗口或 Computer Use。

本机真实诊断见 `qa/forflow20-local-feishu-diagnosis.json`；错误界面截图 `qa/feishu-config-required.png`；测试结果 `qa/packaged-tests.json`。厂商授权、管理员审批、真实任务读取尚未验证，模拟重试成功不代表真实账号已连接。

## 制品与安装

- 当前状态：候选包已验证，`.19` 仍在运行，尚未覆盖安装；待用户保存退出后安装，保留 `.19` 回退。
- ZIP：`Forflow-One-1.4.205-forflow.20-mac-arm64.zip`
- ZIP SHA256：`8ddf9836d1389fec636be33d4a9a8aab8ae67d0e0e5d456bd72d7fd99f7579db`
- app.asar SHA256：`94594a30f3f2f1a5cf5dc8f0ae17b2b8c2f0fbe3a3ec215b74fa3b396672fef1`
- 严格签名、解压回读和源码指纹通过。仍为本机 ad-hoc 签名，未做 Apple 公证。

配置和恢复步骤见 [飞书操作说明](feishu-tasks.md)。分类依据为 [官方错误合同](https://github.com/larksuite/cli/blob/2d787fe5d6f35e279f39fe630328ad3689bf2aff/errs/ERROR_CONTRACT.md)，与本机版本匹配。
