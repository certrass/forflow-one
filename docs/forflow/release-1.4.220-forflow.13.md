# 字体与排版统一 · 1.4.220-forflow.13

- 任务页三项动作与说明分别对齐，来源筛选放在下方。
- 会话操作统一为 32px 按钮，减少重复状态文字。
- 审阅去掉重复标题与外层卡片，文件列表和已选材料在宽窗口并排、窄窗口顺序排列；保留键盘选择与底部操作。
- 启动时的中文字体回退顺序与现有规范一致，主窗口和独立窗口共用；深色底部背景统一。

## 验证与安装状态

344 文件／3,588 项回归、字体与外观专项 5 项、完整类型和构建、中文目录、改动行规范、严格签名、ZIP CRC 均通过。最终候选包 4 个隐藏 Electron 场景通过，覆盖任务、并行比较草稿、审阅版本与重启回读，以及浅深色、680px 窄窗口和键盘材料选择。使用隔离 HOME、模拟 CLI 和示例材料。

代码 `e79e6fc5af2aefcda0cf22ae10973a1b8c19c7f0`；ASAR SHA-256 `b363acb9841160174f23905d4e0188992a049c55872ce655bea5f3aaf08da0cd`。

本机当前仍运行 `.12`，`.13` 尚未替换；等待用户确认退出当前窗口。

## 截图

`before-task-actions.png` / `feature-task-actions.png`、`before-review-materials.png` / `feature-review-materials.png`、`before-session-actions.png` / `feature-session-actions.png` 为本轮同尺寸运行的前后对照。`feature-review-dark-compact.png` 展示深色窄窗口。截图使用示例数据。

完整设计判断见 [字体与排版统一](interface-layout.md)。包与证据位于 `~/Library/Caches/Forflow One/builds/1.4.220-forflow.13/`。

初轮回归发现旧空态文案断言和根目录位置提示缺失，已更新文案断言、将项目位置合并到根目录导航后复验。实际画面复查补齐了窄窗口外边距、深色底栏与运行时中文字体；最终证据以 `qa-final/` 为准。
