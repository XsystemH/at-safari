# Composable Safari client

`index.mjs` exports `SafariClient({token, port})`. It provides `status()`, `pairing()`, `result(requestId)` and `tab(handle).snapshot()/execute(steps, requestId)/navigate(url, requestId)`.

The local broker is authoritative for assignments and results. Use the MCP adapter for agent integrations so the administrator token never appears in model prompts. This is a small JavaScript alpha client; it deliberately avoids a separate locator or type-generation framework.
