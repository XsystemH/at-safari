# at-safari：架构与可行性

## 决策与当前证据

选择「Safari Web Extension + Swift 原生桥接 + 本地服务 + SDK/MCP」，目标是使用现有登录状态，在指定后台标签页执行任务。采用单仓库，便于一次 PR 同时修改协议两端。

目前已实现本地开发 alpha：Web Extension、Swift native handler、loopback broker、JS SDK 和七个 MCP 工具。Xcode 26.6 已构建成功；自动化测试覆盖 broker、DOM backend 和实际 MCP stdio。Safari 实机验收单列在 [验证记录](validation.md)，不能用内置浏览器或 jsdom 测试替代。以下未标明已实现的高级能力仍是设计目标。

公开资料支持 Safari 扩展脚本注入及与原生组件通信。后台标签页的输入、复杂编辑器、截图和休眠恢复仍需实机验证。Chrome 的 CDP 输入与可访问性接口不能直接移植到 Safari。

## 为什么靠近 Chrome 风格 SDK

上层提供标签页句柄、语义定位器、页面结构快照、条件等待、批量执行和取消。SDK 客户端对象只是方便调用，服务端才是会话状态的权威来源；客户端重连时必须重新核对会话与标签页。

每个动作都使用指定标签页句柄。MCP 面向模型提供有界批次，不能把模型传入的任意 JavaScript 直接当作本地代码执行。第一阶段只支持类型明确的操作，不开放任意代码执行工具。

## 四个边界

1. **Safari 扩展与 Swift 容器**：发现标签页、请求站点权限、页面结构与动作、接管按钮；原生 handler 负责与包含它的 macOS app 通信。扩展实际执行前再次检查权限和当前会话。
2. **本地服务**：拥有会话、租约、请求队列、结果记录、超时与取消；仲裁多个 agent 对同一标签页的请求。
3. **SDK / MCP**：SDK 封装底层请求，MCP 转换工具参数、结果与错误；不重复实现 DOM 逻辑，不持有 Safari Cookies。
4. **共享协议**：定义版本协商、能力声明、消息封装和状态。MCP 版本与内部桥接协议版本分开。

## 已选择的 alpha 通信路径

Web Extension 使用 `browser.runtime.sendNativeMessage` 调用 Swift app extension handler；handler 通过 ephemeral URLSession 访问固定的 `127.0.0.1:19848`，仅允许配对、轮询和结果提交。JS broker 由 MCP 入口按需启动。这里没有 Chrome 式任意 stdio native host，也不依赖 app 向后台页主动推送。

macOS Manifest V2 persistent background 每秒轮询一次，每次最多接收一个任务。Safari/机器休眠会使轮询中断；超过十秒未收到状态视为离线，截止时间后不再分派，已分派超时则保留 `unknown`。重连重新载入的任务先暂停，要求用户 Resume。长期休眠和 Profile 切换仍需实机回归。

broker 仅绑定 loopback，拒绝带 Origin 的请求，检查 Host、独立 bearer 凭据、请求大小、配对有效期和次数；原生长期凭据保存在 extension sandbox，不返回给 popup JavaScript。当前内部协议为精确匹配 `0.1`，更完整的协议草案、生成类型、租约及取消尚未实现。

## 登录状态与并行操作

直接操作用户授权的现有页面。新任务标签页留在同一 Safari Profile 中；新 Profile / 私密窗口不能假定共享登录。部分应用使用 sessionStorage 或页面内存保存状态，需要保留原标签页或单独适配。

共享账号并不隔离服务端状态：退出登录、购物车或同一文档的修改可能影响其他标签页。正常运行不激活标签页或窗口；需要前台动作时返回需要用户接管的结果。

用户选中任务页或在其中交互时撤销写入租约，后续批次暂停。已经发出的单个动作可能存在竞争窗口，必须实测、记录；不能承诺操作中途可原子撤销。被分配的标签页关闭、重建、跨站跳转或权限撤销都应使原句柄失效或重新授权。

## 人机验证与人工接管

```mermaid
stateDiagram-v2
    [*] --> ready
    ready --> running: execute
    running --> needs_user: challenge / user takeover / unknown result
    needs_user --> checking: explicit resume
    checking --> ready: page and permissions revalidated
    checking --> needs_user: challenge remains or state ambiguous
    running --> ready: completed batch
    ready --> closed: close or revoke
    running --> closed: close or revoke
    needs_user --> closed: close or revoke
```

检测依赖明确可观察的页面信号和可选站点适配器，不能保证识别所有挑战。未知拦截或反复无效操作触发有界停止，不无限刷新。只出现隐藏验证 iframe 不应直接断言用户必须解题。

触发后停止剩余写操作，返回原因、会话句柄、已完成步骤和人工接管标识。用户主动打开原标签页处理验证；插件不自动抢焦点。保留页面与 Cookies 在 Safari 中，不导出验证令牌、不注入伪造通过状态、不使用解码服务。

用户点击继续后，重新检查标签页身份、站点权限、页面状态和动作前置条件。不能仅因为验证码 iframe 消失就判断已通过。恢复后生成新批次；不得盲目重放此前提交。若点击请求已发出但响应丢失，返回结果未知并要求核验，而不是自动重试。

批次需要人工处理时立即结束当前 MCP 调用并返回结构化状态。以后通过显式会话句柄检查与恢复，避免依赖无限期挂起的 MCP 请求或宿主恰好支持某种通知机制。

## 第一阶段不承诺的能力

- 后台原生可信输入、所有富文本编辑器、跨源 frame、关闭的 Shadow DOM。
- 无激活截图、系统文件选择器、钥匙串、通行密钥和操作系统弹窗。
- 任意生产站点无验证码、自动完成验证码、完整复现 Chrome。
- 第三方 agent 应用里的原生 `@Safari` 标签页选择 UI。

这些能力必须通过能力协商单独报告，不能用一个简单页面测试代替。

## 参考资料

- [Safari 扩展与原生消息](https://developer.apple.com/documentation/safariservices/messaging-between-the-app-and-javascript-in-a-safari-web-extension)
- [Safari 15.4 扩展 API](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)
- [Chrome debugger / CDP](https://developer.chrome.com/docs/extensions/reference/api/debugger)
- [Safari Profile 数据隔离](https://support.apple.com/en-ie/105100)
- [Cloudflare 挑战支持边界](https://developers.cloudflare.com/cloudflare-challenges/reference/supported-browsers/)
- [Turnstile 测试密钥](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

资料核对日期：2026-09-11。资料描述的平台能力与本仓库的实现状态应分开报告。
