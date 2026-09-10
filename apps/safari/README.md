# Safari app and extension

`web-extension/` contains the macOS Manifest V2 persistent background script, popup controls and bounded DOM backend. `native/SafariWebExtensionHandler.swift` receives native messages and forwards only pairing, polling and results to the loopback broker. Native credentials stay in the extension's sandboxed defaults, outside JavaScript.

Build with `python3 scripts/build-safari.py` from the repository root. The script generates an Xcode project with Apple's converter, syncs source resources, enables outgoing local networking and creates an ad-hoc development app. Generated Xcode files stay under ignored `work/`.

Users enable the extension and grant each site's access. Assignment and resume are popup-only operations. Selected task tabs, changed origins and trusted user input pause writes. Read snapshots remain available while paused. The alpha handles the top frame only and uses synthetic DOM input, not native input.

App, handler and Web Extension ship together. See [installation](../../README.md) and [validation](../../docs/validation.md).
