# 中文私有版构建与验证

当前发行版本以 `resources/forflow/release-profile.json` 和 [文档索引](README.md) 为准。品牌和兼容协议分开处理：用户界面、应用 ID、配置目录、CLI 入口和图标使用 Forflow；上游 MIT 许可、依赖来源、已有远程协议及持久化字段保留真实含义。更新 Orca 基线时按 [上游合入流程](upstream-updates.md) 在独立工作树验证。

## 固定输入

- 上游：v1.4.205 / `11aba8bdc5e492d3ba01fc7fe333495ace74128f`。
- 构建：Node.js 24.14.0、pnpm 11.19.0、macOS arm64；以 `resources/forflow/release-profile.json` 和 `.node-version` 为准。原上游 packageManager 指向 pnpm 12，本机实际验证为 11.19；本分支现已对齐，不把未运行过的版本写入验证结果。
- 首次准备使用 `pnpm install --frozen-lockfile`；国内环境可配置企业 npm/二进制镜像，但必须保留锁文件与完整性校验。Electron、原生依赖、Swift 构建环境和下载制品均需单独备齐；本轮不声称已从空缓存完成断网构建。
- 包内资源采取显式清单，排除源码、测试、开发配置和模型凭据；不发布 GitHub Release，不调用上游自动更新。

## 中文完整性

`pnpm verify:forflow:localization` 检查英文目录每个 key 的中文覆盖、空值、插值变量多重集合，并拒绝未经逐项登记的原样英文。`resources/forflow/zh-technical-literals.json` 固定保留品牌、命令、路径、协议名、代码示例和搜索别名的精确 key/value；新词条变动须重新审阅。`pnpm verify:localization-catalog` 与 `pnpm verify:localization-runtime-catalog` 检查源码引用及运行时目录同步。

Forflow 在首个应用界面渲染前等待本地中文语言包加载，避免启动先显示英文；语言包仍保持动态分块，不扩大静态启动依赖图。中文字体按 Geist、苹方、微软雅黑、Noto CJK 和系统字体回退；业务内容、文件名、第三方 CLI 输出和源码标识不翻译。中文输入与保存、终端、差异视图按真实安装包验证；系统输入法候选窗等需要可见窗口的验证保留到人工测试。

## 发布流程

`pnpm package:forflow:mac` 会先核对工具链，依次执行中文门禁、三端类型检查、真实身份服务测试及登记的回归套件，再生成生产代码、原生助手和 ad-hoc 签名的独立应用。构建位于 `~/Library/Caches/Forflow One/builds/版本/`，避免同步目录附加 FinderInfo 干扰签名。仅清理由打包生成的 FinderInfo/ResourceFork，不更改系统 Gatekeeper。

对生成的 `.app` 执行 `tests/playwright.forflow-packaged.config.ts`：新配置 smoke、项目/工作树/编辑/终端/重启、自有账号、8 项入门清单与真实进度、实际上传与网页权限、并行任务中文浮层，共 6 条场景。另用 `pnpm exec tsc --noEmit -p config/tsconfig.forflow-packaged.json` 检查这套测试的类型。上游全量 E2E 类型检查仍有独立存档的既有失败，未将其作为通过项。所有测试窗口使用 `ORCA_BACKGROUND_LAUNCH=1` 隐藏，HOME 和用户数据隔离，截图通过 CDP 获取。安装后针对 `/Applications/Forflow One.app` 复验同一套流程；ZIP 解压后再核验签名和 asar 哈希，并核对原 Orca 未改变。

目录校验不覆盖所有硬编码文案或图片。`.3` 已修正引导浮层漏译，并增加 18 步渲染回归；以后保留原清单和操作，不用部署说明替换原功能。中文目录同时拒绝嵌套键与点分键映射到同一路径的重复项。

最终证据必须关联工作树文件指纹、锁文件、运行工具版本、安装包哈希和测试 JSON。旧版本通过记录不能替代新版本记录。当前为本机测试交付；Developer ID 公证、其他 OS/CPU、真实国内模型认证及企业审计存储仍需各自验收。
