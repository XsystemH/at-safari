# 维护与发布

## 单仓库，分别交付

初期不拆成多个仓库。协议、扩展和 MCP 的联动改动放在同一 PR；运行时按职责拆开。无需一开始安排多个维护者，但责任边界要固定。

| 组件 | 建议技术 | 维护内容 | 交付与版本 |
| --- | --- | --- | --- |
| Safari Web Extension | JavaScript / WebExtension | 站点权限、标签页路由、DOM 读取与操作、人工接管、Safari 兼容性 | 随 macOS app 一起发布 |
| Swift 容器和 native handler | Swift / Xcode | 原生消息、进程生命周期、本地配对、签名和公证 | 与扩展使用同一 app 版本 |
| 本地 bridge | Node.js + Swift loopback HTTP | 会话、租约、队列、断线恢复、请求去重 | JS 侧初期与 SDK/MCP 同版本 |
| SDK | JavaScript | 标签页对象、定位器、批次、等待、错误映射 | 初期与 MCP 同版本，后续可独立 |
| MCP adapter | JavaScript + 官方 SDK（lockfile 固定） | 工具 schema、能力声明、结构化结果、客户端兼容 | 初期随 JS tooling 发布 |
| 内部协议 | 规范、schema、生成类型 | 版本协商、兼容矩阵、错误和状态 | 独立协议版本 |
| Codex plugin wrapper | manifest / skills | 安装入口、用法和能力说明 | 跟随已验证 MCP 版本 |

浏览器动作只在扩展后端实现。MCP 不再维护一套点击代码。站点适配器是可选的纯页面逻辑，应携带作用域、测试和能力要求，不能扩大授权站点。

## 协议兼容

当前 alpha 使用内部协议 `0.1` 精确匹配，并由状态工具报告能力。未来连接时交换扩展、app、bridge 版本、支持的内部协议版本列表和能力列表，选择明确的共同版本。没有交集时拒绝连接，并告诉用户更新哪一端。

不要仅凭主版本号或“只差一个版本”假定兼容。每个发布组合都在兼容矩阵中列出。协议升级采用两阶段：先部署能同时理解旧、新消息的接收端，再部署发新消息的发送端；废弃旧协议要有明确的截止版本。

MCP 的协议协商由 MCP 层单独处理。浏览器句柄、暂停状态和恢复票据属于 at-safari 内部协议，不依赖某个 MCP 版本隐含保留的会话。

## 测试分层

1. 协议及状态测试：版本不匹配、重复请求、撤销权限、暂停与恢复、超时后的结果未知。
2. JS 单元测试：定位和批次逻辑；Swift 单元测试：原生消息编解码和访问控制。
3. Safari 集成测试：签名后的 app 与扩展，真实 Safari，页面刷新、后台休眠、Profile 切换、用户抢回标签页。
4. 人工体验验收：用户在 A 输入、agent 在 B 工作，记录输入损坏、标签页切换和前台激活次数；计数目标为零，不能只测请求成功。
5. 挑战测试：自有 fixture 与官方测试密钥用于 CI；真实站点只做用户授权的人工验证。记录每次任务的挑战次数、人工耗时、恢复成功率和重复提交次数，不把测试密钥通过率当作生产结果。

当前 CI 验证仓库、JS 语法、bundle 构建、broker/DOM/MCP 测试。Safari 实机测试和签名分别记录，不能把绿色 Linux CI 解释为所有网站可用。

## 发布流程

- 初期版本均为预发布。JS tooling 的变更可以较频繁，Safari app 的更新需完成 Safari 回归与签名检查。
- 每次发布附上 app、extension、bridge、MCP/SDK、内部协议以及已测试 macOS/Safari 版本的对应关系。
- Swift app 和扩展一起构建、签名、公证；不要让用户分别升级嵌入的 native handler。
- Safari app 可以经 Mac App Store 发布，也可以使用 Developer ID 签名、公证后在商店外分发。开发阶段优先本地 Xcode 构建；构建源码不等于拥有可公开分发的签名包。
- JS tooling 可在具备可安装运行时后发布 npm；Codex 插件只引用已发布、可验证的入口，不随意指向 main。
- 发布凭据放在受保护的 CI 环境，只有维护者批准的发布流程可访问；fork PR 不运行签名任务。
- 更新先停新请求并等待/取消未完成操作；恢复连接后重新协商版本和租约。回滚只能使用兼容协议，不能假定状态可跨版本无损回放。

## 问题归属

- 页面读不到、点击无效、抢标签页、验证恢复失败：Safari/页面后端优先。
- 找不到工具、工具参数异常、宿主客户端不兼容：MCP 层优先。
- 连接失效、重复执行、跨会话串页：bridge/协议优先。

Bug 报告应包含组件版本、Safari/macOS 版本和脱敏复现步骤。不要要求用户上传 Cookie、令牌、完整浏览器资料或私有页面截图。

参考：[Apple 扩展分发](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)、[MCP 版本协商](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)。
