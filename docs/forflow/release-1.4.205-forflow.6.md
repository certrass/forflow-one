# 国内模型与智能体接入入口

版本 `1.4.205-forflow.6`，macOS arm64 本机测试版。安装与测试结果以交付目录 `release.json` 为准。

用户截图展示的是“智能体会话历史”的来源筛选。此前启动目录已有 CodeBuddy 和 Qoder CN，但历史读取器名单没有这两项；豆包通过火山方舟提供模型和工具接入。汉化并没有补齐这些历史读取器，不能把名称加入可勾选名单就宣称已经接入。

本版在截图菜单顶部增加豆包／火山方舟、WorkBuddy／CodeBuddy、QoderWork／Qoder CN 三个接入入口，直接进入智能体设置的国内接入区。下方保留原有历史来源筛选、全选和清除行为。设置展示实际执行主机上的 CLI 检测结果，区分未检测到、检测中和检测失败；不把本机安装状态用于远程主机。搜索增加产品别名。

## 当前可用范围

| 入口 | 实际路径 | 尚未完成 |
| --- | --- | --- |
| 豆包／火山方舟 | 按官方指南在执行器配置模型，`arkcli` 提供模型与工具命令 | Forflow 内模型配置向导、真实 API 联调、独立历史读取 |
| WorkBuddy／CodeBuddy | 已有 `codebuddy` 启动、检测、提示词和进程识别适配 | WorkBuddy 桌面账号／历史导入，CodeBuddy 历史读取及真实登录后的任务验收 |
| QoderWork／Qoder CN | 已有 `qodercn` 国内 CLI 启动适配 | QoderWork 桌面导入，Qoder CN 历史读取及真实登录后的任务验收 |

产品名称用于帮助找到真实接入路径；WorkBuddy 不等同于 CodeBuddy CLI，QoderWork 不等同于 Qoder CN CLI。界面直接显示“历史暂未接入”，这些条目是接入导航，不是假装可用的会话筛选器。

## 验证

新增安装包测试复现用户截图路径：打开历史筛选、核对三项国内入口和原有 Kimi 筛选、点击 WorkBuddy 进入设置、检查官方链接和状态文案。回归覆盖国内启动合同、设置搜索、主机检测失败／等待状态；延续原有完整构建、冒烟、权限、上传、八项入门和汉化回归。

本轮不安装或登录第三方 CLI，不读取模型密钥，不执行模型调用；此前用户明确“稍后配置，先完成当前开发”。原 Orca 应用与用户数据保留。

## 官方依据

2026-09-19 重新核对 [腾讯 CodeBuddy CLI](https://www.codebuddy.cn/docs/cli/cli-reference)、[火山 Ark CLI](https://github.com/volcengine/ark-cli)、[Qoder CN 会话与存储说明](https://docs.qoder.cn/en/cli/sessions)、[Qoder 产品入口](https://docs.qoder.com/product-series/quick-start)。Computer Use 访问 Chrome 本轮超时，改用网页工具读取官方来源。
