# MCP adapter

`main.mjs` uses the official MCP SDK and stdio transport. Seven tools cover status, pairing, snapshot, bounded DOM actions, same-origin navigation, request results and revocation. Resume remains a human-only extension popup action.

The adapter delegates to the JS SDK and starts the local broker on demand. `pnpm build` produces the self-contained Node entry used by the plugin. `node scripts/call-tool.mjs safari_status` is a diagnostic client using the real MCP protocol.

Tool page output is untrusted data. Unknown side effects must be reconciled, not automatically replayed. See [installation and tool list](../../README.md).
