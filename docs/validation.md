# Validation evidence

Updated 2026-09-11. Tests do not imply universal website support.

| Layer | Evidence | Remaining gap |
| --- | --- | --- |
| Broker | Real HTTP tests for pairing, Origin/auth isolation, deduplication, pause, navigation scope, timeout, late results and revocation | Long-running sleep/reconnect and multiple Safari profiles |
| Page backend | jsdom tests for snapshot redaction, DOM events, stale references, visibility takeover, expiry and synthetic challenge detection | Real rich editors and production challenge providers |
| MCP | Official MCP SDK client discovers all seven tools and invokes status/pairing through bundled stdio runtime | Other MCP hosts |
| macOS build | Xcode 26.6 build succeeded; ad-hoc app and embedded extension pass codesign verification | Developer ID signing, notarization, clean-machine installation |
| Safari 26.4 | Installed extension is registered; unsigned development setting enabled | Extension enable checkbox still requires a physical user click; native pairing and background execution not yet verified |

Automated suite currently contains 10 tests. Native input, background screenshots, and cross-origin frame support are intentionally absent.

## Reproduce the manual smoke test

With the bridge running, open `http://127.0.0.1:19848/demo`, pair and assign that tab, then switch away. Run `node scripts/smoke-safari.mjs`. It checks a real Safari snapshot, background fill/click, identical-request deduplication, and the resulting page text. It refuses other origins or pages. Observe the active Safari tab separately before and after to check focus.

The installation UI may reject automated extension-enabling clicks. Have the user physically enable the extension; do not change Safari preferences behind its UI. See [Apple troubleshooting](https://support.apple.com/en-us/108379).
