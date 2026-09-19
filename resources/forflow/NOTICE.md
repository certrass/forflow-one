# Forflow One 开发分支来源

本分支基于 https://github.com/stablyai/orca 的 v1.4.205，提交
`11aba8bdc5e492d3ba01fc7fe333495ace74128f`。

上游软件许可证为 MIT，版权声明为 `Copyright (c) 2026 Lovecast Inc.`。
仓库根目录 LICENSE 保持原文；交付包含该软件的副本或实质部分时保留许可证及版权声明。

Forflow One 是本项目的产品品牌。品牌映射不改变开源代码来源、第三方组件许可、模型服务运营主体或供应链事实。
本机 macOS arm64 中文测试版使用 `cn.forflow.one`、独立 Forflow One 数据目录及 `forflow` 命令入口；未注册 URL 协议，避免接管已有 Orca 链接。底层兼容协议和 CLI 帮助中的上游标识仍按迁移计划保留。其他平台及正式签名、公证和升级路径尚未验收。

应用图标复用现有 Forflow 官网工程的品牌素材，来源及 SHA-256 见 `brand-source.json`；`icon.icns` 为原 PNG 的尺寸/格式导出，未重绘品牌。

依赖清单入口：`pnpm audit:forflow`。它只记录直接依赖，完整 SPDX/CycloneDX 物料清单、二进制来源、传递依赖许可证和漏洞检查仍属于发布工作包。
