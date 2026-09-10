# 维护

保持一个仓库、两个交付物：

| 交付物 | 维护内容 |
| --- | --- |
| Safari app | Web Extension、popup、Swift handler 一起构建 |
| MCP 插件 | broker、JS client、MCP adapter 一起打包 |

页面行为只在扩展实现。初期不拆仓库、不建立站点适配框架，也不实现没有真实用例的协议功能。新增功能前先判断能否用现有读页面、点击和填表完成。

开发检查：`pnpm build`、`pnpm check`、`pnpm test`、`python3 scripts/check_repo.py`。Safari 改动另跑 `python3 scripts/build-safari.py`，构建会检查 native handler 的实际联网权限。

更新 app 后刷新 Safari 扩展，确认既有配对仍在线。更新 MCP 后重新安装本地插件，新任务加载新工具。实际后台验收使用 `node scripts/smoke-safari.mjs`，仅操作内置测试页。

当前只交付本地 ad-hoc alpha。签名、公证及通用安装包等到主流程可靠后再做。Bug 记录只需版本、脱敏复现和实际结果，不上传令牌或私人页面内容。
