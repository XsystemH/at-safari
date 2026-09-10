# Validation evidence

Updated 2026-09-11. Tests do not imply universal website support.

| Layer | Evidence | Remaining gap |
| --- | --- | --- |
| Broker | Real HTTP tests for pairing, Origin/auth isolation, deduplication, pause, navigation scope, timeout, late results and revocation | Long-running sleep/reconnect and multiple Safari profiles |
| Page backend | jsdom tests for snapshot redaction, DOM events, stale references, visibility takeover, expiry and synthetic challenge detection | Real rich editors and production challenge providers |
| MCP | Official MCP SDK client discovers all seven tools and invokes status/pairing through bundled stdio runtime | Other MCP hosts |
| macOS build | Xcode 26.6 build succeeded; ad-hoc app and embedded extension pass codesign verification | Developer ID signing, notarization, clean-machine installation |
| Safari 26.4 | Real integration verification in progress | See next recorded manual result |

Automated suite currently contains 10 tests. Native input, background screenshots, and cross-origin frame support are intentionally absent.
