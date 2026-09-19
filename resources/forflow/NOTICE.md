# Forflow One 开发分支来源

本分支基于 https://github.com/stablyai/orca 的 v1.4.205，提交
`11aba8bdc5e492d3ba01fc7fe333495ace74128f`。

上游软件许可证为 MIT，版权声明为 `Copyright (c) 2026 Lovecast Inc.`。
仓库根目录 LICENSE 保持原文；交付包含该软件的副本或实质部分时保留许可证及版权声明。

Forflow One 是本项目的产品品牌。品牌映射不改变开源代码来源、第三方组件许可、模型服务运营主体或供应链事实。
`product.json` 的 appId/命令/协议是目标身份，其中命令及协议迁移尚未完成，不能直接据此发布安装包。

依赖清单入口：`pnpm audit:forflow`。它只记录直接依赖，完整 SPDX/CycloneDX 物料清单、二进制来源、传递依赖许可证和漏洞检查仍属于发布工作包。
