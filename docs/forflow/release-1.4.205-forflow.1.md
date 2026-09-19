# Forflow One 中文本机测试版

版本 `1.4.205-forflow.1`，macOS arm64，2026-09-19。依据用户明确要求：完成 smoke 与回归测试，通过后安装到本机；使用已有 Forflow 品牌图标。真实国内 API 凭据仍按用户决定稍后配置。

## 本次变化

- 应用 `Forflow One.app`，标识 `cn.forflow.one`，配置目录 `~/Library/Application Support/Forflow One`，与 Orca 分开。
- 使用现有官网 `forflow-mark.png` 及品牌字标，保留来源哈希；原色图标用于应用、首屏和权限助手。
- 新配置默认中文；新增 79 项常用中文翻译，修复首屏空状态不随语言包刷新；终端等少量技术标签和扩展页面仍有英文。
- 独立 `forflow` 命令入口和权限助手身份，保留底层兼容接口；不注册 Orca 或尚未实现的 Forflow URL 协议，不自动注册全局 CLI。
- 帮助菜单隐藏上游反馈和社区入口；私有部署策略关闭上游遥测、分享、推送、在线插件下载及更新。
- 安装包采用显式文件清单，排除源码、测试、本地配置和模型凭据；MIT 声明和上游来源保留。

## 验证范围

| 项目         | 方法与证据                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 单元回归     | 29 个文件，340 项；品牌/中文加载、私有策略、国内 CLI、安装路径冲突、Mac 权限、侧栏及兼容元数据                                            |
| 构建与类型   | 正常生产构建，node/CLI/renderer 类型检查、18 个本轮改动源文件 lint；新增代码质量、类型断言、React 与设计系统检查均通过；无测试 store 暴露 |
| 安装包 smoke | 真正的 `.app`，从源码目录外启动；中文首屏、品牌图标、私有默认设置、CLI 路径、零可见测试窗口、无渲染异常                                   |
| 工作流回归   | 临时本地 Git 项目；创建与切换 worktree；真实 node-pty 中文输出；中文 Markdown 编辑保存；差异视图；深色外观 UI 切换；退出重启恢复          |
| 打包内容     | 检查 asar 文件清单，无 `.forflow`、`.env`、源码和测试；保留许可证及品牌原文件                                                             |
| 安装验收     | 安装后执行同一套 smoke/回归，并检查真实默认数据目录、签名、原 Orca 文件哈希                                                               |

测试使用一次性 HOME 与配置目录、无外部 Git remote 和模型请求。生产包无需开发服务或仓库 `node_modules` 即可启动。已发现并修复同步目录的 FinderInfo 元数据导致签名失败；构建改在 `~/Library/Caches/Forflow One/builds/` 进行。深色切换测试改为实际设置界面操作，避免只写持久化设置却跳过前端主题更新。

已安装到 `/Applications/Forflow One.app`。安装前后的 Orca 主程序与 Info.plist 哈希一致。安装包内及安装后的两轮 smoke/工作流回归均为 2/2 通过；另以本机真实默认配置目录验证中文首次启动。ZIP 解压后再次通过签名检查，`app.asar` 与已安装版本哈希一致。

备份安装包与最终测试记录位于 `/Users/zezhou/Documents/ChatGPT/Forflow One Releases/1.4.205-forflow.1/`。从“应用程序”打开 Forflow One 即可开始测试；首次引导可选择已有 CLI 或跳过至项目设置。

## 复验

```sh
pnpm package:forflow:mac
FORFLOW_PACKAGED_APP='/Applications/Forflow One.app' \
FORFLOW_QA_OUTPUT='/absolute/path/to/qa' ORCA_BACKGROUND_LAUNCH=1 \
pnpm exec playwright test --config tests/playwright.forflow-packaged.config.ts
codesign --verify --deep --strict '/Applications/Forflow One.app'
```

本机测试版使用 ad-hoc 签名，未做 Developer ID 公证。国内 CLI 厂商认证、真实模型调用、系统中文输入法组合输入、Intel/Windows/Linux 和企业治理后端不属于本次通过项。完整源文件指纹、制品 SHA-256 和各项最终状态以交付目录 `release.json`、`qa/` 为准。
