# 将 Orca 更新纳入 Forflow One

当前状态（2026-10-13）：v1.4.224 已三方合入私有升级分支，候选与 12 个成品场景通过，最终 Node 类型复验进行中；日常安装为 v1.4.222。见[本轮候选](release-1.4.224-forflow.1.md)与[草稿 PR #6](https://github.com/certrass/forflow-one/pull/6)。

以下是 2026-09-20 的流程检查点，表中的版本是历史起点。更新日期：2026-09-20。本文以 `.14` 提交为核对检查点整理研发操作流程，未拉取或合并新的 Orca 版本；当前 Forflow 发行见 [文档索引](README.md)。工程合入与客户应用更新是两个独立阶段。

## 已核对的起点

| 对象                  | 当前值                                                            |
| --------------------- | ----------------------------------------------------------------- |
| Forflow 仓库 `origin` | `https://github.com/certrass/forflow-one.git`                     |
| Orca 源码 `upstream`  | `https://github.com/stablyai/orca.git`                            |
| `upstream` 推送地址   | `no_push_upstream`，防止默认误推；不是 GitHub 权限控制            |
| Forflow 分支          | `codex/forflow-cn-v1.4.205`                                       |
| Orca 基线             | `v1.4.205` / `11aba8bdc5e492d3ba01fc7fe333495ace74128f`           |
| Forflow 检查点        | `e3dfa009ef0aba9cf152d2d516172365051a650f` / `1.4.205-forflow.14` |

此历史基线是当时 Forflow 提交的祖先，保留了可用于三方合并的历史。上述检查点相对基线有 30 个提交、645 个文件差异，包含功能、资源、测试和文档，并非 645 个冲突。每次更新重新读取 `resources/forflow/product.json` 和 `resources/forflow/release-profile.json`，不将本表当作永久基线。

## 选择更新范围

默认选择经过发布说明、代码和兼容性核对的稳定 tag，再锁定完整 SHA。不要根据 `package.json` 数字大小推断分支新旧；以前核对过的 main 与发行 tag 已出现版本号、源码不一致。

- 常规升级：在独立工作树完整合入选定的上游版本，并保留合并祖先关系。
- 紧急单项修复：可以挑选具体提交，记录原始 SHA、依赖和测试；仅挑选修复时不把产品基线冒充为完整升级到该版本。
- 大规模重构：先判断旧接口、迁移、原生模块和私有策略影响，再决定整体升级或暂留当前基线。

## 拉取、检查与试合并

以下命令供下一次实际升级使用，需先填写经核对的目标 tag 和完整 SHA；本次没有执行。示例适用于 macOS/Linux shell，Windows 可在 Git Bash 中执行。操作从干净、已提交的 Forflow 分支开始。不要自动暂存未提交工作，不覆盖已有分支或工作树。

```sh
# 将两个占位值换成实际核对过的上游发行 tag 和提交。
ORCA_TAG='<已确认的上游tag>'
ORCA_EXPECTED_SHA='<已确认的40位提交SHA>'
FORFLOW_BASE=$(git rev-parse HEAD)
ORCA_OLD_SHA=$(node -p "require('./resources/forflow/product.json').upstream.commit")
SYNC_BRANCH="codex/upstream-${ORCA_TAG}"
SYNC_WORKTREE="../forflow-upstream-${ORCA_TAG}"

# 状态必须为空；当前分支须是准备升级的 Forflow 分支。
git status --short
git branch --show-current
git remote -v

# 只读取选定 tag；放入独立命名空间，避免和 Forflow 发布 tag 混淆。
git ls-remote --tags upstream "refs/tags/${ORCA_TAG}" "refs/tags/${ORCA_TAG}^{}"
git fetch --no-tags upstream "refs/tags/${ORCA_TAG}:refs/tags/vendor/orca/${ORCA_TAG}"
ORCA_TARGET_SHA=$(git rev-parse "refs/tags/vendor/orca/${ORCA_TAG}^{commit}")
test "$ORCA_TARGET_SHA" = "$ORCA_EXPECTED_SHA"

# 任一步失败即停止。若不是祖先关系，调查发行分支分叉，不强行合入。
git merge-base --is-ancestor "$ORCA_OLD_SHA" "$FORFLOW_BASE"
git merge-base --is-ancestor "$ORCA_OLD_SHA" "$ORCA_TARGET_SHA"
git log --oneline --max-count=80 "$ORCA_OLD_SHA..$ORCA_TARGET_SHA"
git diff --stat "$ORCA_OLD_SHA" "$ORCA_TARGET_SHA"
git diff --name-only "$ORCA_OLD_SHA" "$ORCA_TARGET_SHA"

# 先读差异，再在新分支试合并；保留当前开发工作区。
git worktree add -b "$SYNC_BRANCH" "$SYNC_WORKTREE" "$FORFLOW_BASE"
cd "$SYNC_WORKTREE"
git merge --no-ff --no-commit "$ORCA_TARGET_SHA"
git status --short
```

发行标签可能分叉：本轮 v222 与 v224 的共同祖先为 `761d63a4e52ff7915d4432c004df13182db63010`。旧 tag 不是新 tag 的祖先时，先核实两者的官方发行身份、共同祖先和双侧差异；完成审查后可正常三方合并，不伪造线性关系，也不覆盖已有国内历史。

命令按步骤执行，不整段盲跑。`fetch` 只获取对象和引用；`merge --no-ff --no-commit` 在形成合并提交前停下，供解决冲突和检查。冲突时逐文件判断，禁止整批选择 ours/theirs。即便没有文本冲突，也要检查新入口是否绕过 Forflow 策略。放弃试合并时，在这个新工作树中执行 `git merge --abort`；不要对主开发目录执行清理或重置。[Git fetch](https://git-scm.com/docs/git-fetch)、[Git merge](https://git-scm.com/docs/git-merge)、[Git worktree](https://git-scm.com/docs/git-worktree)

## 必须保住的产品行为

| 上游可能改变的位置                    | Forflow 复核重点                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| 品牌、默认配置、菜单、首次启动        | 应用 ID、用户数据目录、图标、中文、完整八项入门，不重新接回 Orca 云账号        |
| 云服务、插件、分享、诊断、更新        | 新增调用入口和域名；继续执行私有策略，不能只保留旧拦截点                       |
| 身份、凭据、国内执行器                | 自有账号、Kimi/智谱/DeepSeek 本地账户、CLI 名称、技能离线安装及权限恢复        |
| Native Chat、终端、工作区             | 同会话切换不重启 Agent；草稿、文件引用、单次发送、分屏目标、并行项目和更改审阅 |
| 设置、数据库、会话、守护进程          | 升级迁移、既有数据可读性、进程兼容、回退所需的数据版本                         |
| SSH/远程协议、Git 能力                | 新旧客户端/主机混用、执行主机归属、Git 2.25 回退、文件夹工作区                 |
| package/lockfile/Electron/原生模块/CI | Node/pnpm 兼容、依赖来源和下载、各架构资源；审查新增安装脚本与发布工作流       |

保留 MIT 许可和真实依赖来源。协议、持久化字段、第三方命令名不作全局字符串替换。品牌和策略优先集中在现有 Forflow 配置、模块和服务中；必须改上游核心的地方保留小而明确的接点及行为测试。不要为减少冲突重写已有工作区或会话系统。

锁文件冲突应先确定最终依赖和工具链，再用选定 pnpm 生成并审查变化；不能整体覆盖或随手升级全部依赖。按 `docs/reference/pnpm-install-policy.md` 准备目标架构依赖。

## 验证与纳入私有分支

1. 完成冲突处理；更新 `product.json` 的上游 tag/SHA 和 `release-profile.json` 的 Forflow 版本。工具链只有验证后才改，相关 `.node-version`、packageManager、锁文件保持一致。版本号可沿用“上游版本-forflow.序号”，已发出的版本与制品不覆盖。
2. 运行中文目录和运行时目录核验、变更质量检查、`pnpm audit:forflow`。静态域名清单用于比较新增服务，不等于完整出站审计或 SBOM。生成器造成的目录变化也要审阅。
3. 当前 macOS arm64 发行流程为 `pnpm package:forflow:mac`，内含中文门禁、类型检查、身份服务测试及登记的项目回归。增加与上游本次变更有关的测试，不用旧版通过数量替代新结果。具体命令和边界见 [构建说明](build-and-localization.md)。
4. 用最终候选包执行 `tests/playwright.forflow-packaged.config.ts`，覆盖品牌、CLI、国内账户、私有默认行为、工作区及 GUI 工作台。设置 `ORCA_BACKGROUND_LAUNCH=1`，隔离 HOME/用户数据，使用隐藏窗口和 CDP。保留失败和复测记录，不使用真实用户项目充当夹具。
5. 另做升级验证：脱敏旧配置副本、会话与状态迁移、旧版应用/配置回退。只备份 `.app` 不足以应对不可逆数据迁移。按受影响范围复验 SSH/远程和目标平台，不把本机测试等同于所有平台通过。
6. 提交合并结果及适配修复，推送 `origin` 的集成分支，PR 的目标为实际 Forflow 开发/发行分支。PR 合并保留上游祖先关系，**这类同步 PR 不使用 squash/rebase merge**；否则后续 Git 难以利用本次合入关系。不要向 `upstream` 推送。
7. PR 如果又纳入新的开发提交，重新验证最终版本。交付记录绑定上游 SHA、Forflow SHA、工具链、锁文件/源码指纹、测试输出和安装包哈希；从最终来源构建独立 Forflow 制品。

上游 `.github/workflows` 也属于审查对象，不因完成源码合并就启用它的部署、云发布或签名流程。是否启用私有仓库 CI 应另行核对配置和权限。

## 客户如何收到更新

当前 `cn-private` 策略禁用上游更新，Forflow 打包配置 `publish: null`，构建命令 `--publish never`。现有交付是验证后的本机测试安装包；尚未建设 Forflow 在线更新服务。

后续按部署方式提供 Forflow 国内更新源或客户内网制品源，并保留离线包。更新清单需对应版本、OS/CPU、哈希和签名，支持管理员控制、分批验证和回退；禁止无配置时回退到 Orca 更新源。正式签名、公证、下载失败恢复、旧版到新版的数据迁移以及更新器自身都须独立验证后再启用。

因此，Orca 的一次发布首先成为 Forflow 的升级候选；只有完成适配与验证，才成为客户能安装的 Forflow 更新。
